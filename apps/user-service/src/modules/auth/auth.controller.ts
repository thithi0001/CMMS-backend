import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { 
    USER_CMD, 
    LoginDto, 
    RefreshTokenDto,
} from "@app/shared";
import type { 
    ChangePasswordMsg,
} from "@app/shared";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
    constructor(
        private readonly auth: AuthService
    ) {}

    @MessagePattern(USER_CMD.LOGIN)
    login(@Payload() dto: LoginDto) {
        return this.auth.login(dto);
    }

    @MessagePattern(USER_CMD.REFRESH_TOKEN)
    refreshToken(@Payload() dto: RefreshTokenDto) {
        return this.auth.refreshToken(dto.refreshToken);
    }

    @MessagePattern(USER_CMD.CHANGE_PASSWORD)
    changePassword(@Payload() msg: ChangePasswordMsg) {
        return this.auth.changePassword(msg);
    }

    @MessagePattern(USER_CMD.FORGET_PASSWORD)
    forgetPassword(@Payload() msg: any) {
        return this.auth.forgetPassword(msg);
    }
}