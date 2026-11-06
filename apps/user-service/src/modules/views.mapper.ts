import type { 
    UserView, DepartmentView,  
    EmployeeView,
    ExpertiseView, AssignExpertiseView,
} from '@app/shared';
import type { users, roles, departments, employees, expertises, technician_expertise } from '../prisma/generated/client';
import type { Role } from '@app/shared/types/role';

export function toUserView(
    user: users & { roles: roles }
): UserView {
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

export function toDepartmentView(department: departments): DepartmentView {
    return {
        id: department.id,
        code: department.code,
        name: department.name,
    };
}

export function toEmployeeView(
    employee: employees & { departments: departments }
): EmployeeView {
    return {
        id: employee.id,
        userId: employee.user_id,
        department: toDepartmentView(employee.departments),
        position: employee.position || "Missing",
        startDate: employee.start_date.toDateString(),
        endDate: employee.end_date?.toDateString(),
    };
}

export function toExpertiseView(expertise: expertises): ExpertiseView {
    return {
        id: expertise.id,
        code: expertise.code,
        name: expertise.name || "",
        description: expertise.description || "",
    };
}

export function toAssignExpertiseView(
    assign: technician_expertise, revokedAt?: Date,
): AssignExpertiseView {
    return {
        userId: assign.user_id,
        expertiseId: assign.expertise_id,
        assignedAt: assign.created_at?.toISOString() || "Missing",
        revokedAt: revokedAt?.toISOString(),
    };
}