import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { Task_tag } from '@app/shared/types/maintenance-enums';

export class CreateTaskDto {
    
    creatorId!: number;
    
    title!: string;
    
    tag!: Task_tag;

    content!: string;
    
    scheduledStartAt!: string;
    
    scheduledEndAt!: string;
}

export class UpdateTaskDto {
    title
    tag
    content
    scheduledStartAt
    scheduledEndAt
}

export class UpdateTaskStageDto {
    stage
    actualStartAt
    actualEndAt
}

export class FindTaskQueryDto extends FindQueryDto {
    userId
    tag
    stage
    from
    to
}
