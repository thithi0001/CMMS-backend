import { JwtPayload } from "@app/shared/types/jwt-payload";
import { CreateBatchDto, CreateInventorySourceDto, CreateItemDto, CreateRequireItemDto, CreateUsageItemDetailDto, CreateUsageItemListDto, FindBatchQueryDto, FindInventorySourceQueryDto, FindRequireItemQueryDto, FindUsageItemListQueryDto, UpdateInventorySourceDto, UpdateItemDto, UpdateRequireItemDto, UpdateUsageItemDetailDto } from "./inventory.dto";

// === SOURCES ===
export interface CreateInventorySourceMsg { dto: CreateInventorySourceDto, actor: JwtPayload }
export interface UpdateInventorySourceMsg { id: number, data: UpdateInventorySourceDto, actor: JwtPayload }
export interface DeleteInventorySourceMsg { id: number, actor: JwtPayload }

// === ITEMS ===
export interface CreateItemMsg { dto: CreateItemDto, actor: JwtPayload }
export interface UpdateItemMsg { id: number, data: UpdateItemDto, actor: JwtPayload }

// === BATCHES ===
export interface CreateBatchMsg { dto: CreateBatchDto, actor: JwtPayload }
export interface FindBatchMsg { q: FindBatchQueryDto, actor: JwtPayload }

// === REQUIRE ITEMS ===
export interface CreateRequireItemMsg { dto: CreateRequireItemDto, actor: JwtPayload }
export interface UpdateRequireItemMsg { id: number, data: UpdateRequireItemDto, actor: JwtPayload }
export interface RequireItemActionMsg { id: number, actor: JwtPayload }
export interface DeleteRequireItemMsg extends RequireItemActionMsg {}

// === USAGE ITEMS ===
export interface CreateUsageItemListMsg { dto: CreateUsageItemListDto, actor: JwtPayload }
export interface DeleteUsageItemMsg { id: number, actor: JwtPayload }

// === USAGE ITEM DETAILS ===
export interface CreateUsageItemDetailMsg { dto: CreateUsageItemDetailDto, actor: JwtPayload }
export interface UpdateUsageItemDetailMsg { id: number, data: UpdateUsageItemDetailDto, actor: JwtPayload }



