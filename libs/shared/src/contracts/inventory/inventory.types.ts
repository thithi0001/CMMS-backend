export interface InventorySourceView {
    id: number;
    name: string;
    code: string;
    type: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ItemView {
    id: number;
    manufacturer: {
        id: number;
        name: string;
        code: string;
    };
    supplier: {
        id: number;
        name: string;
        code: string;
    };
    name: string | null;
    code: string;
    unit: string | null;
    description?: string | null;
    stock: number;
    minimum: number;
    isLow: boolean;
    imgUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface BatchView {
    id: number;
    creatorId: number;
    item: {
        id: number;
        name: string | null;
        code: string;
    };
    quantity: number;
    remain: number;
    unitPrice?: string;
    totalPrice?: string;
    importDate: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface RequireItemView {
    id: number;
    item: {
        id: number | null;
        name: string | null;
        code: string;
    } | null;
    creatorId: number;
    confirmerId?: number | null;
    isConfirmed: boolean;
    reason?: string;
    requires?: string;
    quantity: number;
    isFulfilled: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UsageItemView {
    id: number;
    creatorId: number;
    taskId: number;
    isBlocked: boolean;
    details: Array<{
        id: number;
        itemId: number;
        batchId: number;
        name: string | null;
        code: string;
        take: number;
        used?: number;
        updatedAt?: string;
    }>;
    createdAt?: string;
}

export interface UsageItemCreateSuccess {
    itemId: number;
    requestedQuantity: number;
    allocatedQuantity: number;
}

export interface UsageItemCreateShortage {
    itemId: number;
    currentQuantity: number;
    requestedQuantity: number;
    shortageQuantity: number;
}

export interface UsageItemListResult {
    view: UsageItemView | null;
    successfulItems: UsageItemCreateSuccess[];
    shortageItems: UsageItemCreateShortage[];
    notFoundItemIds: number[];
    alreadyInListItems?: number[];
}