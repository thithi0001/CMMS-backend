import {
    InventorySourceView, ItemView, BatchView, RequireItemView, UsageItemView,
    InventorySourceType,
} from '@app/shared';
import type { sources, Prisma } from '../prisma/generated/client';

export function toInventorySourceView(source: sources): InventorySourceView {
    return {
        id: source.id,
        name: source.name,
        code: source.code,
        type: source.type as InventorySourceType,
        createdAt: source.created_at?.toISOString(),
        updatedAt: source.updated_at?.toISOString(),
    };
}

type ItemWithRelations = Prisma.itemsGetPayload<{
    include: {
        sources_items_manufacturer_idTosources: true,
        sources_items_supplier_idTosources: true,
    };
}>;
export function toItemView(item: ItemWithRelations): ItemView {
    return {
        id: item.id,
        manufacturer: {
            id: item.manufacturer_id,
            name: item.sources_items_manufacturer_idTosources.name,
            code: item.sources_items_manufacturer_idTosources.code,
        },
        supplier: {
            id: item.supplier_id,
            name: item.sources_items_supplier_idTosources.name,
            code: item.sources_items_supplier_idTosources.code,
        },
        name: item.name,
        code: item.code,
        unit: item.unit,
        description: item.description,
        stock: item.stock,
        minimum: item.minimum_stock,
        isLow: (item.stock <= item.minimum_stock),
        imgUrl: item.img_url,
        createdAt: item.created_at?.toISOString(),
        updatedAt: item.updated_at?.toISOString(),
    };
}

type BatchWithRelation = Prisma.batchesGetPayload<{
    include: { items: { select: { name: true, code: true }}};
}>;
export function toBatchView(batch: BatchWithRelation): BatchView {
    return {
        id: batch.id,
        creatorId: batch.creator_id,
        item: {
            id: batch.item_id,
            name: batch.items.name,
            code: batch.items.code,
        },
        quantity: batch.quantity,
        remain: batch.remain_quantity,
        unitPrice: batch.unit_price?.toString(),
        totalPrice: batch.total_price?.toString(),
        importDate: batch.import_date.toDateString(),
        createdAt: batch.created_at?.toISOString(),
        updatedAt: batch.updated_at?.toISOString(),
    };
}

type RequireItemWithRelation = Prisma.require_itemsGetPayload<{
    include: { items: { select: { name: true, code: true }}};
}>;
export function toRequireItemView(r: RequireItemWithRelation): RequireItemView {
    return {
        id: r.id,
        item: r.items? {
            id: r.item_id,
            name: r.items.name,
            code: r.items.code,
        } : null,
        creatorId: r.creator_id,
        confirmerId: r.confirmer_id,
        isConfirmed: r.is_confirmed,
        reason: r.reason || "",
        requires: r.requires || "",
        quantity: r.quantity,
        isFulfilled: r.is_fulfilled,
        createdAt: r.created_at?.toISOString(),
        updatedAt: r.updated_at?.toISOString(),
    };
}

type UsageItemWithRelations = Prisma.usage_item_listsGetPayload<{
    include: {
        usage_item_details: {
            include: {
                batches: { include: { items: { select: { name: true, code: true }}}},
            },
        },
    };
}>;
export function toUsageItemView(u: UsageItemWithRelations): UsageItemView {
    return {
        id: u.id,
        creatorId: u.creator_id,
        taskId: u.task_id,
        details: u.usage_item_details.map(detail => ({
            id: detail.id,
            batch: {
                id: detail.batch_id,
                item: {
                    id: detail.batches.item_id,
                    name: detail.batches.items.name,
                    code: detail.batches.items.code,
                },
            },
            take: detail.take_quantity ?? 0,
            used: detail.used_quantity ?? undefined,
            updatedAt: detail.updated_at?.toISOString(),
        })),
        createdAt: u.created_at?.toISOString(),
    };
}
