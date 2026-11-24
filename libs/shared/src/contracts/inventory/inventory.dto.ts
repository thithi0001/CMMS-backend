import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray, IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength, ValidateNested
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';
import { InventorySourceType } from './inventory.enums';

// extend source
export class CreateInventorySourceDto {
    @IsNotEmpty() @IsString() name!: string;
    @IsNotEmpty() @IsString() code!: string;
    @IsNotEmpty() @IsIn(Object.values(InventorySourceType)) type!: InventorySourceType;
}

export class UpdateInventorySourceDto {
    @IsOptional() @IsString() name?: string;
    @IsOptional() @IsString() code?: string;
    @IsOptional() @IsIn(Object.values(InventorySourceType)) type?: InventorySourceType;
}

export class FindInventorySourceQueryDto extends FindQueryDto {
    @IsOptional() @IsIn(Object.values(InventorySourceType)) type?: InventorySourceType;
}

export class CreateItemDto {
    @IsInt() @Min(1) manufacturerId!: number;
    @IsInt() @Min(1) supplierId!: number;
    @IsNotEmpty() @IsString() name!: string;
    @IsNotEmpty() @IsString() code!: string;
    @IsNotEmpty() @IsString() unit!: string;
    @IsString() description?: string;
    @IsInt() @Min(1) minimum!: number;
    @IsNotEmpty() @IsString() imgUrl?: string;
}

export class UpdateItemDto {
    @IsOptional() @IsString() name?: string;
    @IsOptional() @IsString() code?: string;
    @IsOptional() @IsString() unit?: string;
    @IsOptional() @IsString() description?: string;
    @IsOptional() @IsInt() @Min(1) minimum?: number;
    @IsOptional() @IsString() imgUrl?: string;
}

export class FindItemQueryDto extends FindQueryDto {
    @IsOptional() @IsString() unit?: string;
    @IsOptional() @IsInt() @Min(1) manufacturerId?: number;
    @IsOptional() @IsInt() @Min(1) supplierId?: number;
    @IsOptional() @IsBoolean() isLow?: boolean;
}

export class CreateBatchDto {
    @IsInt() @Min(1) itemId!: number;
    @IsInt() @Min(1) quantity!: number;
    
    @IsOptional()
    @IsString()
    @Matches(/^\d{1,16}(?:\.\d{1,2})?$/, {
        message: 'unitPrice phải không âm, tối đa 16 chữ số nguyên và 2 chữ số thập phân'
    })
    unitPrice!: string;
    
    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'importDate phải có định dạng YYYY-MM-DD',
    })
    @IsDateString(
        { strict: true },
        { message: 'importDate không phải ngày hợp lệ' },
    )
    importDate!: string;
}

export class FindBatchQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) itemId?: number;
}

export class CreateRequireItemDto {
    @IsOptional() @IsInt() @Min(1) itemId?: number;
    @IsOptional() @IsString() reason?: string;
    @IsOptional() @IsString() requires?: string;
    @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class UpdateRequireItemDto {
    @IsOptional() @IsInt() @Min(1) itemId?: number | null;
    @IsOptional() @IsString() reason?: string;
    @IsOptional() @IsString() requires?: string;
    @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class FindRequireItemQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) itemId?: number;
    @IsOptional() @IsBoolean() isConfirmed?: boolean;
    @IsOptional() @IsBoolean() isFulfilled?: boolean;
}

export class UsageItemRequestDto {
    @IsInt() @Min(1) itemId!: number;
    @IsInt() @Min(1) requestedQuantity!: number;
}

export class CreateUsageItemListDto {
    @IsInt() @Min(1) taskId!: number;
    
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique((item: UsageItemRequestDto) => item.itemId)
    @ValidateNested({ each: true })
    @Type(() => UsageItemRequestDto)
    requestedItems!: UsageItemRequestDto[];
}

export class UpdateUsageItemListRequestDto {
    @IsInt() @Min(1) itemId!: number;
    @IsOptional() @IsInt() @Min(1) quantityToAdd?: number;
    @IsOptional() @IsInt() @Min(0) used?: number;
}

export class UpdateUsageItemListDto {
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique((item: UpdateUsageItemListRequestDto) => item.itemId)
    @ValidateNested({ each: true })
    @Type(() => UpdateUsageItemListRequestDto)
    items!: UpdateUsageItemListRequestDto[];
}

export class FindUsageItemListQueryDto extends FindQueryDto {
    @IsOptional() @IsInt() @Min(1) userId?: number;
    @IsOptional() @IsInt() @Min(1) taskId?: number;
}

