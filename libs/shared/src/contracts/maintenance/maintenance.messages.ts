import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateTaskDto, 
    UpdateTaskDto
} from "./maintenance.dto";
import { TaskStage } from "@app/shared/contracts/maintenance/maintenance.enum";

// === TASKS ===
export interface CreateTaskMsg { dto: CreateTaskDto, actor: JwtPayload }
export interface UpdateTaskMsg { id: number, data: UpdateTaskDto, actor: JwtPayload }
export interface TaskActionMsg { id: number, actor: JwtPayload }
export interface DeleteTaskMsg extends TaskActionMsg {}
export interface CancelTaskMsg extends DeleteTaskMsg {}
export interface ChangeTaskStageMsg { id: number, newStage: TaskStage, actor: JwtPayload }

// === TICKETS ===


// === TASK PROPOSALS ===


// === DAMAGE REPORTS ===


// === DISPOSE PROPOSALS ===


// === ACCEPTANCES ===


// === ASSIGNEES ===

