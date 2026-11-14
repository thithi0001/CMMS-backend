import { JwtPayload } from "@app/shared/types/jwt-payload";
import { 
    ChangeTaskStageDto,
    CreateAcceptanceDto,
    CreateAssigneeDto,
    CreateDamageReportDto,
    CreateDisposeProposalDto,
    CreateTaskDto, 
    CreateTaskProposalDto, 
    CreateTicketDto, 
    FindAcceptanceQueryDto, 
    FindAssigneeQueryDto, 
    FindDamageReportQueryDto, 
    FindDisposeProposalQueryDto, 
    FindTaskProposalQueryDto, 
    FindTaskQueryDto, 
    FindTicketQueryDto, 
    UpdateAcceptanceDto, 
    UpdateAssigneeDto, 
    UpdateDamageReportDto, 
    UpdateDisposeProposalDto, 
    UpdateTaskDto,
    UpdateTaskProposalDto,
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
export interface CreateTaskProposalMsg { dto: CreateTaskProposalDto, actor: JwtPayload }
export interface UpdateTaskProposalMsg { id: number, data: UpdateTaskProposalDto, actor: JwtPayload }
export interface DeleteTaskProposalMsg { id: number, actor: JwtPayload }
export interface FindTaskProposalMsg { q: FindTaskProposalQueryDto, actor: JwtPayload }

// === DAMAGE REPORTS ===
export interface CreateDamageReportMsg { dto: CreateDamageReportDto, actor: JwtPayload }
export interface UpdateDamageReportMsg { id: number, data: UpdateDamageReportDto, actor: JwtPayload }
export interface DeleteDamageReportMsg { id: number, actor: JwtPayload }
export interface FindDamageReportMsg { q: FindDamageReportQueryDto, actor: JwtPayload }

// === DISPOSE PROPOSALS ===
export interface CreateDisposeProposalMsg { dto: CreateDisposeProposalDto, actor: JwtPayload }
export interface UpdateDisposeProposalMsg { id: number, data: UpdateDisposeProposalDto, actor: JwtPayload }
export interface DeleteDisposeProposalMsg { id: number, actor: JwtPayload }
export interface FindDisposeProposalMsg { q: FindDisposeProposalQueryDto, actor: JwtPayload }

// === ACCEPTANCES ===
export interface CreateAcceptanceMsg { dto: CreateAcceptanceDto, actor: JwtPayload }
export interface UpdateAcceptanceMsg { id: number, data: UpdateAcceptanceDto, actor: JwtPayload }
export interface DeleteAcceptanceMsg { id: number, actor: JwtPayload }
export interface FindAcceptanceMsg { q: FindAcceptanceQueryDto, actor: JwtPayload }

// === ASSIGNEES ===
export interface CreateAssigneeMsg { dto: CreateAssigneeDto, actor: JwtPayload }
export interface UpdateAssigneeMsg { id: number, data: UpdateAssigneeDto, actor: JwtPayload }
export interface DeleteAssigneeMsg { id: number, actor: JwtPayload }
export interface FindAssigneeMsg { q: FindAssigneeQueryDto, actor: JwtPayload }

