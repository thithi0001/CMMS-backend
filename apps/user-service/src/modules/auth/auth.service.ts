import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcryptjs';
import { 
    ChangePasswordMsg, JwtPayload,
    LoginDto, LoginResult,
    Role, UserView,
} from "@app/shared";
import { UserEventsPublisher } from "../../messaging/user-events.publisher";
import { toUserView } from "../users/users.mapper";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
        private readonly events: UserEventsPublisher,
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

        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            roleId: user.role_id,
        };
        const accessToken = await this.jwt.signAsync(payload);
        const view = toUserView(user);
        this.events.loggedIn(view);
        return {
            accessToken,
            user: view,
        };

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

    async forgetPassword() {
        return {
            message: 'Password reset successfully'
        };
    }
}