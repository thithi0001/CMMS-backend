import type { UserView } from '@app/shared';
import type { users } from '../../prisma/generated/client';

export function toUserView(user: users): UserView {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        roleId: user.role_id,
        isActive: user.is_active,
        fullname: user.fullname || "No name",
        dob: user.dob.toDateString(),
        phone: user.phone?.toString() || "Missing",
        createdAt: user.created_at?.toISOString() || "Missing",
        updatedAt: user.updated_at?.toISOString() || "Missing",
    };
}