import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateUserDto, UpdateUserDto, ChangePasswordDto,
    CreateDepartmentDto,
    CreateEmployeeDto, EndEmployeeDto,
    CreateExpertiseDto, AssignExpertiseDto
} from './user.dto';

// === USERS ===
export interface CreateUserMsg { dto: CreateUserDto; actorId: number }
export interface FindUserByIdMsg { id: number }
export interface UpdateUserMsg { id: number, data: UpdateUserDto, actor: JwtPayload }
export interface UpdateRoleMsg { id: number, roleCode: Role, actor: JwtPayload }
export interface ChangePasswordMsg { actorId: number, dto: ChangePasswordDto }
export interface DeactivateUserMsg { id: number; actor: JwtPayload }

// === DEPARTMENT ===
export interface CreateDepartmentMsg { dto: CreateDepartmentDto, actorId: number }

// === EMPLOYEE ===
export interface CreateEmployeeMsg { dto: CreateEmployeeDto, actorId: number }
export interface EndEmployeeMsg { id: number, data: EndEmployeeDto, actor: JwtPayload }

// === EXPERTISE ===
export interface CreateExpertiseMsg { dto: CreateExpertiseDto, actorId: number }
export interface AssignExpertiseMsg { data: AssignExpertiseDto, actor: JwtPayload }

