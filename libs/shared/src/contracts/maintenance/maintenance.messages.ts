import { JwtPayload } from "@app/shared/types/jwt-payload";
import { 
    ChangeTaskStageDto,
    CreateAcceptanceDto,
    CreateTaskDto, 
    CreateTicketDto, 
    FindAcceptanceQueryDto, 
    FindTaskQueryDto, 
    FindTicketQueryDto, 
    UpdateAcceptanceDto, 
    UpdateTaskDto,
    UpdateTicketDto
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
export interface CreateTicketMsg { dto: CreateTicketDto, actor: JwtPayload }
export interface UpdateTicketMsg { id: number, data: UpdateTicketDto, actor: JwtPayload }
export interface TicketActionMsg { id: number, actor: JwtPayload }
export interface DeleteTicketMsg extends TicketActionMsg {}
export interface FindTicketMsg { q: FindTicketQueryDto, actor: JwtPayload }

// === TASK PROPOSALS ===


// === DAMAGE REPORTS ===


// === DISPOSE PROPOSALS ===


// === ACCEPTANCES ===
export interface CreateAcceptanceMsg { dto: CreateAcceptanceDto, actor: JwtPayload }
export interface UpdateAcceptanceMsg { id: number, data: UpdateAcceptanceDto, actor: JwtPayload }
export interface DeleteAcceptanceMsg { id: number, actor: JwtPayload }
export interface FindAcceptanceMsg { q: FindAcceptanceQueryDto, actor: JwtPayload }

// === ASSIGNEES ===

