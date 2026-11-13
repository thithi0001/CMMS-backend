import { JwtPayload } from "@app/shared/types/jwt-payload";
import { 
    ChangeTaskStageDto,
    CreateTaskDto, 
    UpdateTaskDto
} from "./maintenance.dto";
import { TaskStage } from "@app/shared";

// === TASKS ===
export interface CreateTaskMsg { dto: CreateTaskDto, actor: JwtPayload }
export interface UpdateTaskMsg { id: number, data: UpdateTaskDto, actor: JwtPayload }
export interface TaskActionMsg { id: number, actor: JwtPayload }
export interface DeleteTaskMsg extends TaskActionMsg {}
export interface CancelTaskMsg extends DeleteTaskMsg {}
export interface ChangeTaskStageMsg { id: number, data: ChangeTaskStageDto, actor: JwtPayload }

// === TICKETS ===


// === TASK PROPOSALS ===


// === DAMAGE REPORTS ===


// === DISPOSE PROPOSALS ===


// === ACCEPTANCES ===


// === ASSIGNEES ===

