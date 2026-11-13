import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { TaskStage, TaskTag, Priority } from '@app/shared';

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
    assigneeId
    taskId
    deadline
}

export class UpdateAssigneeDto {
    status
    deadline
}

export class FindAssigneeQueryDto extends FindQueryDto {
    userId
    taskId
    status
}

export class CreaeteTaskProposalDto {
    taskId
    content
}

export class UpdateTaskProposalDto {
    content
    managerReview
    status
}

export class FindTaskProposalQueryDto {
    userId
    taskId
    status
}

export class CreateDamageReportDto {
    taskId
    deviceId
    content
}

export class UpdateDamageReportDto {
    content
    status
}

export class FindDamageReportQueryDto {
    userId
    taskId
    deviceId
    status
}

export class CreateDisposeProposalDto {
    taskId
    deviceId
    content
}

export class UpdateDisposeProposalDto {
    content
    status
}

export class FindDisposeProposalQueryDto extends FindQueryDto {
    userId
    taskId
    deviceId
    status
}

export class CreateAcceptanceDto {
    taskId
    content
}

export class UpdateAcceptanceDto {
    content
    managerReview
    status
}

export class FindAcceptanceQueryDto {
    userId
    taskId
    status
}