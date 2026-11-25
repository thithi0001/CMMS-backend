export const InventorySourceType = {
    MANUFACTURER: 'manufacturer',
    SUPPLIER: 'supplier',
} as const;
export type InventorySourceType = (typeof InventorySourceType)[keyof typeof InventorySourceType];

