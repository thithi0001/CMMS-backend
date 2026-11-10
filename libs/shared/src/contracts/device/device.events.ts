export interface CategoryEventPayload {
    categoryId: number;
    categoryName: string;
    categoryCode: string;
}

export interface CategoryUpdatePayload {
    categoryId: number;
    changedFields: string[];
}

export interface DeviceEventPayload {
    
}