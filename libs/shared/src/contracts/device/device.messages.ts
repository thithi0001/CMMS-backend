import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateCategoryDto, 
    CreateDeviceDto, 
} from './device.dto';

// === CATEGORIES ===
export interface CreateCategoryMsg { dto: CreateCategoryDto, actorId: number }

// === DEVICES ===
export interface CreateDeviceMsg { dto: CreateDeviceDto, actorId: number }


