import { JwtPayload } from "@app/shared/types/jwt-payload";
import { Role } from "@app/shared/types/role";
import { 
    CreateTaskDto, 
    UpdateTaskDto
} from "./maintenance.dto";

// === TASKS ===
export interface CreateTaskMsg { dto: CreateTaskDto, actorId: number }
export interface UpdateTaskMsg { id: number, data: UpdateTaskDto, actor: JwtPayload }

// === TICKETS ===


// === TASK PROPOSALS ===


// === DAMAGE REPORTS ===


// === DISPOSE PROPOSALS ===


// === ACCEPTANCES ===


// === ASSIGNEES ===

