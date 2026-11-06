import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';

export class CreateUserDto {
    @IsString()
    @MinLength(3)
    @MaxLength(32)
    @Matches(/^[a-zA-Z0-9_.]+$/, { message: 'username chỉ gồm chữ, số, dấu _ và .' })
    username!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72) // giới hạn của bcrypt
    password!: string;

    @IsEmail()
    email!: string;

    @IsIn(Object.values(Role))
    roleCode!: Role;

    @IsString()
    @IsNotEmpty()
    fullname!: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'dob phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'dob không phải ngày hợp lệ' },
    )
    dob!: string;

    @IsString()
    phone!: string;
}

// @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
//     message: 'startedAt phải có thời gian và múi giờ',
// })

export class LoginDto {
    @IsString() @IsNotEmpty() username!: string;
    @IsString() @IsNotEmpty() password!: string;
}

export class RefreshTokenDto {
    @IsString() @IsNotEmpty() refreshToken!: string;
}

export class UpdateUserDto {
    @IsString() @IsOptional() fullname?: string;
    @IsString() @IsOptional() phone?: string;
    
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'dob phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'dob không phải ngày hợp lệ' },
    )
    @IsOptional() 
    dob?: string;
}

export class UpdateRoleDto {
    @IsIn(Object.values(Role))
    roleCode!: Role;
}

export class ChangePasswordDto {
    @IsString() @IsNotEmpty() currentPassword!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(72)
    newPassword!: string;
}

export class FindUserQueryDto extends FindQueryDto {    
    @IsOptional()
    @IsIn(Object.values(Role))
    roleCode?: Role;
}

export class CreateDepartmentDto {
    @IsString() @IsNotEmpty() name!: string;
    @IsString() @IsNotEmpty() code!: string;
}

export class FindDepartmentQueryDto extends FindQueryDto {}

export class CreateEmployeeDto {
    @IsInt() @IsNotEmpty() userId!: number;
    @IsInt() @IsNotEmpty() departmentId!: number;
    @IsString() @IsNotEmpty() position!: string;
    
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'startDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'startDate không phải ngày hợp lệ' },
    )
    startDate!: string;
    
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'endDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'endDate không phải ngày hợp lệ' },
    )
    @IsOptional() 
    endDate?: string;
}

export class EndEmployeeDto {
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'endDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'endDate không phải ngày hợp lệ' },
    )
    endDate!: string;
}

export class FindEmployeeQueryDto extends FindQueryDto {
    @IsOptional() @IsString() department?: string;
    @IsOptional() @IsInt() userId?: number;
}

export class CreateExpertiseDto {
    @IsString() @IsNotEmpty() name!: string;
    @IsString() @IsNotEmpty() code!: string;
    @IsString() @IsOptional() description?: string;
}

export class FindExpertiseQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() userId?: number;
}

export class AssignExpertiseDto {
    @IsInt() @IsNotEmpty() userId!: number;
    @IsInt() @IsNotEmpty() expertiseId!: number;
}