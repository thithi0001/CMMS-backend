import { Role } from "@app/shared/types/role";

export interface UserEventPayload {
    userId: number;
    username: string;
    roleId: number;
}

export interface UserLoggedInPayload {
    userId: number;
    username: string;
}

export interface UserLoginFailedPayload {
    username: string;
    reason: 'USER_NOT_FOUND' | 'WRONG_PASSWORD' | 'INACTIVE';
}

export interface UserUpdatedPayload {
    userId: number;
    changedFields: string[];
}

export interface UserRoleChangedPayload {
    userId: number;
    oldRole: number;
    newRole: number;
}

export interface UserPasswordChangedPayload {
    userId: number;
}