import { JwtPayload } from "@app/shared/types/jwt-payload";
import { 
    ChangeTaskStageDto,
    CreateTaskDto, 
    FindTaskQueryDto, 
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
export interface FindTaskMsg { q: FindTaskQueryDto, actor: JwtPayload }

// === TICKETS ===


// === TASK PROPOSALS ===


// === DAMAGE REPORTS ===


// === DISPOSE PROPOSALS ===


// === ACCEPTANCES ===


// === ASSIGNEES ===

