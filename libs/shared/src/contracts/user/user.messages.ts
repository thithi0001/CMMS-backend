import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    ChangePasswordDto,
    CreateUserDto,
    UpdateUserDto,
} from './user.dto';

export interface CreateUserMsg { dto: CreateUserDto; actorId: number }
export interface FindUserByIdMsg { id: number }
export interface UpdateUserMsg { id: number, data: UpdateUserDto, actor: JwtPayload }
export interface UpdateRoleMsg { id: number, roleId: number, actor: JwtPayload }
export interface ChangePasswordMsg { actorId: number, dto: ChangePasswordDto }
export interface DeactivateUserMsg { id: number; actor: JwtPayload }