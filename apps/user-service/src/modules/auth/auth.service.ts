import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from 'bcryptjs';
import { 
    ChangePasswordMsg, JwtPayload,
    LoginDto, LoginResult,
    RefreshTokenResult,
    Role, UserView,
} from "@app/shared";
import { UserEventsPublisher } from "../../messaging/publishers/user-events.publisher";
import { toUserView } from "../views.mapper";
import { UsersService } from "../users/users.service";
import { EmployeesService } from "../employees/employees.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly employees: EmployeesService,
        private readonly jwt: JwtService,
        private readonly events: UserEventsPublisher,
        private readonly config: ConfigService,
    ) {}
    
    async login(dto: LoginDto): Promise<LoginResult> {
        const username = dto.username.toLowerCase();
        const user = await this.users.findUserByUserName(username);
        const correctPassword = user ? 
            await bcrypt.compare(dto.password, user.hashed_password) : 
            false;

        if (!user || !correctPassword) {
            this.events.loginFailed({
                username, 
                reason: user ? 'WRONG_PASSWORD' : 'USER_NOT_FOUND'
            });
            throw new UnauthorizedException('Wrong username or password');
            
        }
        if (!user.is_active) {
            this.events.loginFailed({
                username, 
                reason: 'INACTIVE'
            });
            throw new ForbiddenException('Account has been deactivated');
        }
        const employee = await this.employees.findEmployeeByUserId(user.id);
        if (!employee) {
            throw new UnauthorizedException('User is not permitted to access');
        }

        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            roleId: user.role_id,
            roleCode: user.roles.code as Role,
            employeeId: employee.id,
        };
        const { accessToken, refreshToken } = await this.generateTokens(payload);
        const view = toUserView(user);
        this.events.loggedIn(view);
        return {
            accessToken,
            refreshToken,
            user: view,
        };

    }

    async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
        let payload: JwtPayload;

        try {
            payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
                secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        if (payload.tokenType !== 'refresh') {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.users.findUserById(payload.sub);
        if (!user || !user.is_active) {
            throw new UnauthorizedException('User is inactive or no longer exists');
        }

        const employee = await this.employees.findEmployeeByUserId(user.id);
        if (!employee) {
            throw new UnauthorizedException('User is not permitted to access');
        }

        return this.generateTokens({
            sub: user.id,
            username: user.username,
            roleId: user.role_id,
            roleCode: user.roles.code as Role,
            employeeId: employee.id,
        });
    }

    private async generateTokens(payload: JwtPayload) {
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync({
                ...payload,
                tokenType: 'access',
            }),
            this.jwt.signAsync(
                {
                    ...payload,
                    tokenType: 'refresh',
                },
                {
                    secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
                    expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '1d') as JwtSignOptions['expiresIn'],
                },
            ),
        ]);

        return { accessToken, refreshToken };
    }
    
    async changePassword({ actorId, dto }: ChangePasswordMsg) {
        const user = await this.users.findUserById(actorId);
        const correctPassword = user ? 
            await bcrypt.compare(dto.currentPassword, user.hashed_password) : 
            false;
        if (!user || !correctPassword) {
            throw new UnauthorizedException('Wrong current password');
        }
        await this.users.setPassword(
            actorId,
            await bcrypt.hash(dto.newPassword, 12)
        );
        this.events.passwordChanged(actorId);
        return {
            message: 'Password changed successfully'
        };
    }

    async forgetPassword({ actorId, dto }: any) {
        return {
            message: 'Password reset successfully'
        };
    }
}