import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';

