import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload, Role } from '@app/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<Role[]>(
            ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ],
        );
        if (!roles?.length) return true;

        const user: JwtPayload | undefined = context.switchToHttp().getRequest().user;
        if (!user || !roles.includes(user.roleCode)) {
            throw new ForbiddenException('Unauthorized action');
        }

        return true;
    }
}