import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { 
    DeviceState, IntervalUnit, SourceType, RequestStatus, 
    HandoverType, 
} from '@app/shared/types/device.enum';

export class CreateCategoryDto {
    @IsString() @IsNotEmpty() name!: string;

    @IsString() @IsNotEmpty() code!: string;
    
    @IsOptional() @IsString() description?: string;
    
    @IsOptional()
    @IsInt() @Min(1)
    intervalValue?: number;
    
    @IsOptional()
    @IsIn(Object.values(IntervalUnit))
    intervalUnit?: IntervalUnit;
    
    @IsOptional()
    @IsInt() @Min(1)
    depreciationPeriodMinMonths?: number;
    
    @IsOptional()
    @IsInt() @Min(1)
    depreciationPeriodMaxMonths?: number;
}

export class UpdateCategoryDto {
    @IsOptional() @IsString() name?: string;

    @IsOptional() @IsString() code?: string;

    @IsOptional() @IsString() description?: string;

    @IsOptional()
    @IsInt() @Min(1)
    intervalValue?: number;

    @IsOptional()
    @IsIn(Object.values(IntervalUnit))
    intervalUnit?: IntervalUnit;

    @IsOptional()
    @IsInt() @Min(1)
    depreciationPeriodMinMonths?: number;
    
    @IsOptional()
    @IsInt() @Min(1)
    depreciationPeriodMaxMonths?: number;
}

export class FindCategoryQueryDto extends FindQueryDto {
    @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSourceDto {
    @IsNotEmpty() @IsString() name!: string;
    @IsIn(Object.values(SourceType)) type!: SourceType;
}

export class UpdateSourceDto {
    @IsOptional() @IsString() name?: string;
}

export class FindSourceQueryDto extends FindQueryDto {
    @IsOptional() @IsIn(Object.values(SourceType)) type?: SourceType;
}

export class CreateDeviceDto {
    @IsNotEmpty()
    @IsInt() @Min(1)
    categoryId!: number;

    @IsNotEmpty()
    @IsInt() @Min(1)
    manufacturerId!: number;

    @IsNotEmpty()
    @IsInt() @Min(1)
    supplierId!: number;

    @IsNotEmpty() @IsString() code!: string;

    @IsOptional() @IsString() model?: string;

    @IsOptional() @IsString() serialNumber?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'manufactureDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'manufactureDate không phải ngày hợp lệ' },
    )
    manufactureDate?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'purchaseDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'purchaseDate không phải ngày hợp lệ' },
    )
    purchaseDate?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'purchasePrice phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    purchasePrice?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'originalCost phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    originalCost?: string;

    @IsOptional() @IsObject() specifications?: Record<string, string>;

    @IsOptional() @IsString() imgUrl?: string;

    @IsOptional() @IsString() installLocation?: string;
}

export class UpdateDeviceDto {
    @IsOptional()
    @IsInt() @Min(1)
    categoryId?: number;

    @IsOptional()
    @IsInt() @Min(1)
    manufacturerId?: number;

    @IsOptional()
    @IsInt() @Min(1)
    supplierId?: number;
    
    @IsOptional() @IsString() code?: string;
    @IsOptional() @IsString() model?: string;
    @IsOptional() @IsString() serialNumber?: string;
    @IsOptional() @IsObject() specifications?: Record<string, string>;
    @IsOptional() @IsString() imgUrl?: string;
    @IsOptional() @IsString() installLocation?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'manufactureDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'manufactureDate không phải ngày hợp lệ' },
    )
    manufactureDate?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'purchaseDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'purchaseDate không phải ngày hợp lệ' },
    )
    purchaseDate?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'purchasePrice phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    purchasePrice?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'originalCost phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    originalCost?: string;
}

export class FindDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsString() category?: string;
    @IsOptional() @IsString() manufacturer?: string;
    @IsOptional() @IsString() supplier?: string;
    @IsOptional() @IsIn(Object.values(DeviceState)) state?: DeviceState;
}

export class FindDeviceHistoryDto extends FindQueryDto {
    @IsNotEmpty() @IsInt() @Min(1) deviceId!: number;
}

export class CreateAssignDeviceDto {
    @IsNotEmpty() @IsInt() @Min(1) categoryId!: number;
    @IsNotEmpty() @IsString() reason!: string;
    @IsNotEmpty() @IsString() require!: string;
}

export class UpdateAssignDeviceDto {
    @IsOptional() @IsString() reason?: string;
    @IsOptional() @IsString() require?: string;
    @IsOptional() @IsIn(Object.values(RequestStatus)) status?: RequestStatus;
}

export class FindAssignDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number
    @IsOptional() @IsInt() @Min(1) categoryId?: number
    @IsOptional() @IsIn(Object.values(RequestStatus)) status?: RequestStatus;
}

export class CreateRetrieveDeviceDto {
    @IsInt() @Min(1) deviceId!: number;
    @IsInt() @Min(1) confirmerId!: number;
    @IsDateString() requiredTime!: string;
}

export class UpdateRetrieveDeviceDto {
    @IsOptional() @IsBoolean() isConfirmed?: boolean;
    @IsOptional() @IsDateString() requiredTime?: string;
    @IsOptional() @IsInt() @Min(1) handoverId?: number;
}

export class FindRetrieveDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsBoolean() isConfirmed?: boolean;
    @IsOptional() @IsInt() @Min(1) userId?: number;
}

export class CreateHandoverDeviceDto {
    @IsInt() @Min(1) deviceId!: number;
    @IsInt() @Min(1) deliverId!: number;
    @IsInt() @Min(1) receiverId!: number;
    @IsIn(Object.values(HandoverType)) type!: HandoverType;
}

export class UpdateHandoverDeviceDto {
    @IsOptional() @IsDateString() handoveredAt?: string;
}

export class FindHandoverDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsBoolean() isHandoverd?: boolean;
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsIn(Object.values(HandoverType)) type?: HandoverType;
}

export class CreateDisposeDeviceDto {
    @IsInt() @Min(1) deviceId!: number;
    
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'disposalDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'disposalDate không phải ngày hợp lệ' },
    )
    disposalDate!: string;
    
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'disposalValue phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    disposalValue!: string;
    
    @IsOptional() @IsString() reason?: string;
}

export class FindDisposeDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number
}

export class CreateDeviceEmployeeDto {
    @IsInt() @Min(1) deviceId!: number;
    @IsInt() @Min(1) employeeId!: number;
    @IsDateString() assignedAt!: string;
}

export class UpdateDeviceEmployeeDto {
    @IsDateString() returnedAt!: string;
}

export class FindDeviceEmployeeQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number
    @IsOptional() @IsBoolean() isReturned?: boolean;
}

