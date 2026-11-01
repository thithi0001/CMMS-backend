import { Role } from "@app/shared/types/role";

export interface UserView {
    id: number;
    username: string;
    email: string;
    roleId: number;
    isActive: boolean;
    fullname: string;
    dob: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginResult {
    accessToke: string;
    user: UserView;
}

export interface UserStats {
    total: number;
    active: number;
    byRole: Record<number, number>;
}