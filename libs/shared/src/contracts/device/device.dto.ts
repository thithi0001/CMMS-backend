import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { Interval_Unit } from '@app/shared/types/device-enums';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    code!: string;
    
    @IsString()
    description?: string;
    
    @IsInt()
    intervalValue?: number;
    
    @IsIn(Object.values(Interval_Unit))
    intervalUnit?: Interval_Unit;
    
    @IsInt()
    depreciationPeriodMinMonths?: number;
    
    @IsInt()
    depreciationPeriodMaxMonths?: number;
}

export class UpdateCategoryDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    intervalValue?: number;

    @IsOptional()
    @IsIn(Object.values(Interval_Unit))
    intervalUnit?: Interval_Unit;

    @IsOptional()
    @IsInt()
    depreciationPeriodMinMonths?: number;
    
    @IsOptional()
    @IsInt()
    depreciationPeriodMaxMonths?: number;
}

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    categoryCode!: string;

    @IsString()
    @IsNotEmpty()
    manufacturerCode!: string;

    @IsString()
    @IsNotEmpty()
    supplierCode!: string;

    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    model?: string;

    @IsString()
    serial_number?: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'manufacture_date phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'manufacture_date không phải ngày hợp lệ' },
    )
    manufacture_date?: string;

    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'purchase_date phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'purchase_date không phải ngày hợp lệ' },
    )
    purchase_date?: string;

    purchase_price?: number;

    original_cost?: string;

    specifications?: any;

    @IsString()
    img_url?: string;

    @IsString()
    install_location?: string;
}

export class UpdateDeviceDto {
    
}





