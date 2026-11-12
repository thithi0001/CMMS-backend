import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateAssignDeviceDto,
    CreateCategoryDto, 
    CreateDeviceDto,
    CreateDeviceEmployeeDto,
    CreateDisposeDeviceDto,
    CreateHandoverDeviceDto,
    CreateRetrieveDeviceDto,
    CreateSourceDto,
    UpdateAssignDeviceDto,
    UpdateCategoryDto,
    UpdateDeviceDto,
    UpdateDeviceEmployeeDto,
    UpdateHandoverDeviceDto,
    UpdateRetrieveDeviceDto,
    UpdateSourceDto, 
} from './device.dto';
import { DeviceState } from "@app/shared/types/device.enum";

// === CATEGORIES ===
export interface CreateCategoryMsg { dto: CreateCategoryDto, actor: JwtPayload }
export interface UpdateCategoryMsg { id: number, data: UpdateCategoryDto, actor: JwtPayload }
export interface DeleteCategoryMsg { id: number, actor: JwtPayload }

// === SOURCES ===
export interface CreateSourceMsg { dto: CreateSourceDto, actor: JwtPayload }
export interface UpdateSourceMsg { id: number, data: UpdateSourceDto, actor: JwtPayload }

// === DEVICES ===
export interface CreateDeviceMsg { dto: CreateDeviceDto, actor: JwtPayload }
export interface UpdateDeviceMsg { id: number, data: UpdateDeviceDto, actor: JwtPayload }
export interface ChangeDeviceStateMsg { id: number, newState: DeviceState, actor: JwtPayload }

// === DEVICE ACTIONS ===
// ASSIGN
export interface CreateAssignDeviceMsg { dto: CreateAssignDeviceDto, actor: JwtPayload }
export interface UpdateAssignDeviceMsg { id: number, data: UpdateAssignDeviceDto, actor: JwtPayload }
export interface DeleteAssignDeviceMsg { id: number, actor: JwtPayload }

// RETRIEVE
export interface CreateRetrieveDeviceMsg { dto: CreateRetrieveDeviceDto, actor: JwtPayload }
export interface UpdateRetrieveDeviceMsg { id: number, data: UpdateRetrieveDeviceDto, actor: JwtPayload }
export interface DeleteRetrieveDeviceMsg { id: number, actor: JwtPayload }

// HANDOVER
export interface CreateHandoverDeviceMsg { dto: CreateHandoverDeviceDto, actor: JwtPayload }
export interface UpdateHandoverDeviceMsg { id: number, data: UpdateHandoverDeviceDto, actor: JwtPayload }
export interface DeleteHandoverDeviceMsg { id: number, actor: JwtPayload }

// DISPOSE
export interface CreateDisposeDeviceMsg { dto: CreateDisposeDeviceDto, actor: JwtPayload }

// DEVICE & EMPLOYEE
export interface CreateDeviceEmployeeMsg { dto: CreateDeviceEmployeeDto, actor: JwtPayload }
export interface UpdateDeviceEmployeeMsg { id: number, data: UpdateDeviceEmployeeDto, actor: JwtPayload }
