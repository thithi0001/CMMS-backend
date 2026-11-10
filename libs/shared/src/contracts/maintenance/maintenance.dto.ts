import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { Task_stage, Task_tag } from '@app/shared/types/maintenance-enums';

export class CreateTaskDto {
    
    creatorId!: number;
    
    title!: string;
    
    tag!: Task_tag;

    content!: string;
    
    scheduledStartAt!: string;
    
    scheduledEndAt!: string;
}

// MANAGER
export class UpdateTaskDto {
    title
    tag
    content
    scheduledStartAt
    scheduledEndAt
}

// TECHNICIAN
export class UpdateTaskProgressDto {
    stage
    actualStartAt
    actualEndAt
}

export class FindTaskQueryDto extends FindQueryDto {
    // search: title, deviceCode:device-service->deviceId, employeeCode/username:user-service->userId
    @IsOptional()
    @IsIn(Object.values(Task_tag))
    tag?: Task_tag;

    @IsOptional()
    @IsIn(Object.values(Task_stage))
    stage?: Task_stage;
    
    // scheduledStartAt, actualStartAt
    @IsOptional()
    from?: string;
    
    //scheduledEndAt, actualEndAt
    @IsOptional()
    to?: string;
}
