import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import type {
    ChangePasswordMsg,
    FindUserByIdMsg, JwtPayload,
    LoginResult,
    RefreshTokenResult,
    UserView, 
} from '@app/shared';
import { 
    USER_CMD, 
    ChangePasswordDto, LoginDto, RefreshTokenDto, 
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly bus: BusService,
    ) {}

    @Public()
    @HttpCode(200)
    @Post('login')
    login(
        @Body() dto: LoginDto
    ) {
        return this.bus.send<LoginResult, LoginDto>(
            USER_CMD.LOGIN, dto
        );
    }

    @Get('me')
    me(
        @CurrentUser() user: JwtPayload
    ) {
        return this.bus.send<UserView, FindUserByIdMsg>(
            USER_CMD.FIND_BY_ID, { id: user.sub }
        );
    }

    @Patch('change-password')
    changePassword(
        @CurrentUser() user: JwtPayload, 
        @Body() dto: ChangePasswordDto
    ) {
        return this.bus.send<{ message: string }, ChangePasswordMsg>(
            USER_CMD.CHANGE_PASSWORD, {
            actorId: user.sub,
            dto,
        });
    }

    @Public()
    @HttpCode(200)
    @Post('refresh-token')
    refreshToken(
        @Body() dto: RefreshTokenDto
    ) {
        return this.bus.send<RefreshTokenResult, RefreshTokenDto>(
            USER_CMD.REFRESH_TOKEN, dto
        );
    }
}