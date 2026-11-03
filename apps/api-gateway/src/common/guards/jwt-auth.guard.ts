import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "@app/shared";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]
        );
        if (isPublic) return true;

        const req = context.switchToHttp().getRequest();
        const [type, token] = req.headers.authorization?.split(' ') ?? [];
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Missing access token');
        }

        try {
            req.user = await this.jwt.verifyAsync<JwtPayload>(token);
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        return true;
    }
}