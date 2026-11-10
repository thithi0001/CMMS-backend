import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateCategoryDto, 
    CreateDeviceDto,
    UpdateCategoryDto, 
} from './device.dto';

// === CATEGORIES ===
export interface CreateCategoryMsg { dto: CreateCategoryDto, actor: JwtPayload }
export interface UpdateCategoryMsg { id: number, data: UpdateCategoryDto, actor: JwtPayload }
export interface DeleteCategoryMsg { id: number, actor: JwtPayload }

// === DEVICES ===
export interface CreateDeviceMsg { dto: CreateDeviceDto, actorId: number }


