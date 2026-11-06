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
    oldRole: string;
    newRole: string;
}

export interface UserPasswordChangedPayload {
    userId: number;
}

export interface DepartmentEventPayload {
    departmentId: number;
    departmentCode: string;
    departmentName: string;
}

export interface EmployeeEventPayload {
    employeeId: number;
    userId: number;
    departmentId: number;
    position: string;
    startDate: string;
    endDate?: string;
}

export interface ExpertiseEventPayload {
    userId?: number;
    expertiseId: number;
    expertiseCode?: string;
    assignedAt?: string;
    revokedAt?: string;
}