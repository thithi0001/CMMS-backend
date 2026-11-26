import { JwtPayload } from "@app/shared/types/jwt-payload";
import { CreateBatchDto, CreateInventorySourceDto, CreateItemDto, CreateRequireItemDto, CreateUsageItemListDto, FindBatchQueryDto, FindInventorySourceQueryDto, FindRequireItemQueryDto, FindUsageItemListQueryDto, UpdateInventorySourceDto, UpdateItemDto, UpdateRequireItemDto, UpdateUsageItemListDto, UsageItemRequestDto } from "./inventory.dto";
import { RequestUploadDto } from "../storage";

// === SOURCES ===
export interface CreateInventorySourceMsg { dto: CreateInventorySourceDto, actor: JwtPayload }
export interface UpdateInventorySourceMsg { id: number, data: UpdateInventorySourceDto, actor: JwtPayload }
export interface DeleteInventorySourceMsg { id: number, actor: JwtPayload }

// === ITEMS ===
export interface CreateItemMsg { dto: CreateItemDto, actor: JwtPayload }
export interface UpdateItemMsg { id: number, data: UpdateItemDto, actor: JwtPayload }
export interface RequestItemImageUploadMsg { itemId: number; dto: RequestUploadDto; actor: JwtPayload }
export interface ConfirmItemImageMsg { itemId: number; imageId: number; actor: JwtPayload }
export interface RemoveItemImageMsg { itemId: number; imageId: number; actor: JwtPayload }

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
export interface UpdateUsageItemListMsg { id: number, data: UpdateUsageItemListDto, actor: JwtPayload }
export interface BlockUsageItemListMsg { id: number, actor: JwtPayload }



