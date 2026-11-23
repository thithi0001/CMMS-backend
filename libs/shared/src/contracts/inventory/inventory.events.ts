import { InventorySourceType } from "./inventory.enums";

export interface InventorySourceEventPayload {
    sourceId: number;
    sourceCode: string;
    changedFields?: string[];
}

export interface ItemEventPayload {
    itemId: number;
    itemCode: string;
    changedFields?: string[];
}

export interface RequireItemEventPayload {
    requireId: number;
    creatorId: number;
    changedFields?: string[];
}

export interface BatchEventPayload {
    batchId: number;
    itemId: number;
    itemCode: string;
}

export interface UsageItemListEventPayload {
    listId: number;
    creatorId: number;
    totalItem: number;
    addedItems?: number[];
    updatedItems?: number[];
}
