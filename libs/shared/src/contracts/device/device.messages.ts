import { JwtPayload } from "@app/shared/types/jwt-payload";
import { 
    CreateAssignDeviceDto,
    CreateCategoryDto, 
    CreateDeviceDto,
    CreateDeviceEmployeeDto,
    CreateDisposeDeviceDto,
    CreateHandoverDeviceDto,
    CreateRetrieveDeviceDto,
    CreateDeviceSourceDto,
    FindAssignDeviceQueryDto,
    UpdateAssignDeviceDto,
    UpdateCategoryDto,
    UpdateDeviceDto,
    UpdateDeviceEmployeeDto,
    UpdateHandoverDeviceDto,
    UpdateRetrieveDeviceDto,
    UpdateDeviceSourceDto,
    FindHandoverDeviceQueryDto, 
} from './device.dto';
import { DeviceState } from "./device.enums";
import { RequestUploadDto } from "../storage";

// === CATEGORIES ===
export interface CreateCategoryMsg { dto: CreateCategoryDto, actor: JwtPayload }
export interface UpdateCategoryMsg { id: number, data: UpdateCategoryDto, actor: JwtPayload }
export interface DeleteCategoryMsg { id: number, actor: JwtPayload }

// === SOURCES ===
export interface CreateDeviceSourceMsg { dto: CreateDeviceSourceDto, actor: JwtPayload }
export interface UpdateDeviceSourceMsg { id: number, data: UpdateDeviceSourceDto, actor: JwtPayload }
export interface DeleteDeviceSourceMsg { id: number, actor: JwtPayload }

// === DEVICES ===
export interface CreateDeviceMsg { dto: CreateDeviceDto, actor: JwtPayload }
export interface UpdateDeviceMsg { id: number, data: UpdateDeviceDto, actor: JwtPayload }
export interface ChangeDeviceStateMsg { id: number, newState: DeviceState, actor: JwtPayload }
export interface RequestDeviceImageUploadMsg { id: number; dto: RequestUploadDto; actor: JwtPayload }
export interface ConfirmDeviceImageMsg { id: number; imageId: number; actor: JwtPayload }
export interface RemoveDeviceImageMsg { id: number; imageId: number; actor: JwtPayload }

// === DEVICE ACTIONS ===
// ASSIGN
export interface CreateAssignDeviceMsg { dto: CreateAssignDeviceDto, actor: JwtPayload }
export interface UpdateAssignDeviceMsg { id: number, data: UpdateAssignDeviceDto, actor: JwtPayload }
export interface DeleteAssignDeviceMsg { id: number, actor: JwtPayload }
export interface FindAssignDeviceMsg { q: FindAssignDeviceQueryDto, actor: JwtPayload }

// RETRIEVE
export interface CreateRetrieveDeviceMsg { dto: CreateRetrieveDeviceDto, actor: JwtPayload }
export interface UpdateRetrieveDeviceMsg { id: number, data: UpdateRetrieveDeviceDto, actor: JwtPayload }
export interface DeleteRetrieveDeviceMsg { id: number, actor: JwtPayload }

// HANDOVER
export interface CreateHandoverDeviceMsg { dto: CreateHandoverDeviceDto, actor: JwtPayload }
export interface UpdateHandoverDeviceMsg { id: number, data: UpdateHandoverDeviceDto, actor: JwtPayload }
export interface DeleteHandoverDeviceMsg { id: number, actor: JwtPayload }
export interface FindHandoverDeviceMsg { q: FindHandoverDeviceQueryDto, actor: JwtPayload }

// DISPOSE
export interface CreateDisposeDeviceMsg { dto: CreateDisposeDeviceDto, actor: JwtPayload }

// DEVICE & EMPLOYEE
export interface CreateDeviceEmployeeMsg { dto: CreateDeviceEmployeeDto, actor: JwtPayload }
export interface UpdateDeviceEmployeeMsg { id: number, data: UpdateDeviceEmployeeDto, actor: JwtPayload }