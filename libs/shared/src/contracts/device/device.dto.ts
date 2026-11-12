import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { DeviceState, IntervalUnit, SourceType, RequestStatus, HandoverType } from '@app/shared/types/device.enum';

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

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;

    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'above phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    above?: string;
    
    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'below phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    below?: string;
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
    
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;
}

export class CreateRetrieveDeviceDto {

}

export class UpdateRetrieveDeviceDto {

}

export class FindRetrieveDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsBoolean() isConfirmed?: boolean;
    @IsOptional() @IsInt() @Min(1) userId?: number;
    
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;
}

export class CreateHandoverDeviceDto {

}

export class UpdateHandoverDeviceDto {

}

export class FindHandoverDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsBoolean() isHandoverd?: boolean;
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsIn(Object.values(HandoverType)) type?: HandoverType;
    
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;
}

export class CreateDisposeDeviceDto {

}

export class FindDisposeDeviceQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number
    
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'from phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'from không phải ngày hợp lệ' },
    )
    from?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'to phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'to không phải ngày hợp lệ' },
    )
    to?: string;

    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'above phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    above?: string;
    
    @IsOptional()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'below phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    below?: string;}

export class CreateDeviceEmployeeDto {

}

export class UpdateDeviceEmployeeDto {

}

export class FindDeviceEmployeeQueryDto extends FindQueryDto {

}

