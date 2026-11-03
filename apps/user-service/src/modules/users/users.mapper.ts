import type { UserView } from '@app/shared';
import type { users } from '../../prisma/generated/client';
import type { roles } from '../../prisma/generated/client';
import type { Role } from '@app/shared/types/role';

export function toUserView(user: users & { roles: roles }): UserView {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: {
            id: user.roles.id,
            code: user.roles.code as Role,
            name: user.roles.name,
        },
        isActive: user.is_active,
        fullname: user.fullname || "No name",
        dob: user.dob.toDateString(),
        phone: user.phone?.toString() || "Missing",
        createdAt: user.created_at?.toISOString() || "Missing",
        updatedAt: user.updated_at?.toISOString() || "Missing",
    };
}