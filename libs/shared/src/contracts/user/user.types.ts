import { Role } from "@app/shared/types/role";

export interface RoleView {
    id: number;
    code: Role;
    name: string;
}

export interface UserView {
    id: number;
    username: string;
    email: string;
    role: RoleView;
    isActive: boolean;
    fullname: string;
    dob: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
}

export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    user: UserView;
}

export interface RefreshTokenResult {
    accessToken: string;
    refreshToken: string;
}

export interface UserStats {
    total: number;
    active: number;
    byRole: Record<number, number>;
}

export interface DepartmentView {
    id: number;
    code: string;
    name: string;
}

export interface ExpertiseView {
    id: number;
    code: string;
    name: string;
    description: string;
}

export interface EmployeeView {
    id: number;
    userId: number;
    department: DepartmentView;
    position: string;
    startDate: string;
    endDate?: string;
}

export interface AssignExpertiseView {
    userId: number;
    expertiseId: number;
    assignedAt?: string;
    revokedAt?: string;
}