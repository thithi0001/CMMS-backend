import { Type } from 'class-transformer';
import {
    IsBoolean, IsDateString,
    IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
    Matches, Max, MaxLength, Min, MinLength
} from 'class-validator';
import { Role } from '@app/shared/types/role';
import { FindQueryDto } from '@app/shared/types/find-query';

// extend source
export class CreateInventorySourceDto {
    name
    type
}

export class CreateItemDto {
    manufacturerId
    supplierId
    name
    code
    unit
    description
    minimumStock
    imgUrl
}

export class UpdateItemDto {}
export class FindItemQueryDto extends FindQueryDto {
    unit
    supplier
    manufacturer
}

export class CreateBatchDto {
    itemId
    quantity
    remainQuantity
    unitPrice
    totalPrice
    importDate
}

export class FindBatchQueryDto extends FindQueryDto {
    userId
}

export class CreateRequireItemDto {
    itemId?
    reason
    requires
    quantity
}

export class FindRequireItemQueryDto extends FindQueryDto {
    userId
    itemId
    isConfirmed
}

export class CreateUsageItemDetailDto {
    batchId
    takeQuantity
}

export class UpdateUsageItemDetailDto {
    usedQuantity
}

export class CreateUsageItemListDto {
    taskId
    list
}

export class FindUsageItemListQueryDto extends FindQueryDto {
    userId
    taskId
}

