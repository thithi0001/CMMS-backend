import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { TaskStage, TaskTag, Priority, AcceptanceStatus, AssigneeStatus, ProposalStatus } from './maintenance.enums';

export class CreateTaskDto {
    @IsString() title!: string;
    @IsString() content!: string;
    @IsIn(Object.values(TaskTag)) tag!: TaskTag;
    @IsOptional() @IsDateString() scheduledStartAt?: string;
    @IsOptional() @IsDateString() scheduledEndAt?: string;
}

export class UpdateTaskDto {
    @IsOptional() @IsString() title?: string;
    @IsOptional() @IsIn(Object.values(TaskTag)) tag?: TaskTag;
    @IsOptional() @IsString() content?: string;
    @IsOptional() @IsDateString() scheduledStartAt?: string;
    @IsOptional() @IsDateString() scheduledEndAt?: string;
}

export class ChangeTaskStageDto {
    @IsIn(Object.values(TaskStage)) newStage!: TaskStage;
}

export class FindTaskQueryDto extends FindQueryDto {
    // search: title, deviceCode:device-service->deviceId, employeeCode/username:user-service->userId
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) deviceId?: number;
    @IsOptional() @IsIn(Object.values(TaskTag)) tag?: TaskTag;
    @IsOptional() @IsIn(Object.values(TaskStage)) stage?: TaskStage;
}

export class CreateTicketDto {
    @IsInt() @Min(1) deviceId!: number
    @IsIn(Object.values(Priority)) priority?: Priority;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() imgUrl?: string;
}

export class UpdateTicketDto {
    @IsOptional() @IsIn(Object.values(Priority)) priority?: Priority;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsString() imgUrl?: string;
}

export class FindTicketQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) deviceId?: number;
    @IsOptional() @IsBoolean() isConfirmed?: boolean;
    @IsOptional() @IsIn(Object.values(Priority)) priority?: Priority;
}

export class CreateAssigneeDto {
    @IsInt() @Min(1) assigneeId!: number;
    @IsInt() @Min(1) taskId!: number;
    @IsOptional() @IsDateString() deadline?: string;
}

export class UpdateAssigneeDto {
    @IsOptional() @IsIn(Object.values(AssigneeStatus)) status?: AssigneeStatus;
    @IsOptional() @IsDateString() deadline?: string;
}

export class FindAssigneeQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
    @IsOptional() @IsIn(Object.values(AssigneeStatus)) status?: AssigneeStatus;
}

export class CreateTaskProposalDto {
    @IsInt() @Min(1) taskId!: number;
    @IsOptional() @IsString() content?: string;
}

export class UpdateTaskProposalDto {
    @IsOptional() @IsString() content?: string;
    @IsOptional() @IsString() managerReview?: string;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class FindTaskProposalQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class CreateDamageReportDto {
    @IsInt() @Min(1) taskId!: number;
    @IsOptional() @IsString() content?: string;
}

export class UpdateDamageReportDto {
    @IsOptional() @IsString() content?: string;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class FindDamageReportQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
    @IsOptional() @IsInt() @Min(1) deviceId?: number;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class CreateDisposeProposalDto {
    @IsInt() @Min(1) taskId!: number;
    @IsOptional() @IsString() content?: string;
}

export class UpdateDisposeProposalDto {
    @IsOptional() @IsString() content?: string;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class FindDisposeProposalQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
    @IsOptional() @IsInt() @Min(1) deviceId?: number;
    @IsOptional() @IsIn(Object.values(ProposalStatus)) status?: ProposalStatus;
}

export class CreateAcceptanceDto {
    @IsInt() @Min(1) taskId!: number;
    @IsOptional() @IsString() content?: string;
}

export class UpdateAcceptanceDto {
    @IsOptional() @IsString() content?: string;
    @IsOptional() @IsString() managerReview?: string;
    @IsIn(Object.values(AcceptanceStatus)) status?: AcceptanceStatus;
}

export class FindAcceptanceQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
    @IsOptional() @IsIn(Object.values(AcceptanceStatus)) status?: AcceptanceStatus;
}