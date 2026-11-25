import {
    BadRequestException,
    ConflictException, ForbiddenException, Injectable, NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import {
    CreateUsageItemListMsg, CreateUsageItemListResult,
    UpdateUsageItemListMsg, UpdateUsageItemListResult,
    BlockUsageItemListMsg,
    FindUsageItemListQueryDto, Paginated,
    UsageItemCreateShortage, UsageItemCreateSuccess,
    UsageItemView,
} from '@app/shared';
import { UsageItemEventsPublisher } from '../../messaging/publishers/usage-item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUsageItemView } from '../views.mapper';

@Injectable()
export class UsageItemsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: UsageItemEventsPublisher,
    ) {}

    private readonly include = {
        usage_item_details: {
            select: {
                id: true,
                batch_id: true,
                take_quantity: true,
                used_quantity: true,
                updated_at: true,
                batches: {
                    select: {
                        item_id: true,
                        items: { select: { name: true, code: true } },
                    },
                },
            },
        },
    } satisfies Prisma.usage_item_listsSelect;
    // === Nội bộ ===
    findUsageItemById(id: number) {
        return this.prisma.usage_item_lists.findUnique({ 
            where: { id }, include: this.include,
        });
    }

    private async allocateQuantity(
        tx: Prisma.TransactionClient,
        listId: number,
        itemId: number,
        quantity: number,
    ): Promise<void> {
        const batches = await tx.batches.findMany({
            where: {
                item_id: itemId,
                remain_quantity: { gt: 0 },
            },
            orderBy: [
                { import_date: 'asc' },
                { id: 'asc' },
            ],
            select: { id: true, remain_quantity: true },
        });

        let remainingQuantity = quantity;
        for (const batch of batches) {
            if (remainingQuantity === 0) break;

            const takeQuantity = Math.min(
                remainingQuantity,
                batch.remain_quantity,
            );
            const batchUpdate = await tx.batches.updateMany({
                where: {
                    id: batch.id,
                    remain_quantity: { gte: takeQuantity },
                },
                data: { remain_quantity: { decrement: takeQuantity }},
            });

            if (batchUpdate.count !== 1) 
                throw new ConflictException(`Batch ${batch.id} changed during allocation`);

            await tx.usage_item_details.upsert({
                where: {
                    list_id_batch_id: {
                        list_id: listId,
                        batch_id: batch.id,
                    },
                },
                create: {
                    list_id: listId,
                    batch_id: batch.id,
                    take_quantity: takeQuantity,
                },
                update: { take_quantity: { increment: takeQuantity }},
            });

            remainingQuantity -= takeQuantity;
        }

        if (remainingQuantity > 0) 
            throw new ConflictException(`Batch quantity is insufficient for item ${itemId}`);

        const itemUpdate = await tx.items.updateMany({
            where: {
                id: itemId,
                stock: { gte: quantity },
            },
            data: { stock: { decrement: quantity }},
        });

        if (itemUpdate.count !== 1) 
            throw new ConflictException(`Stock changed during allocation for item ${itemId}`);
    }

    private async setUsedQuantity(
        tx: Prisma.TransactionClient,
        listId: number,
        itemId: number,
        usedQuantity: number,
    ): Promise<void> {
        const details = await tx.usage_item_details.findMany({
            where: {
                list_id: listId,
                batches: { is: { item_id: itemId } },
            },
            include: { batches: { select: { import_date: true }}},
        });

        details.sort((a, b) =>
            a.batches.import_date.getTime() - b.batches.import_date.getTime() 
            || a.batch_id - b.batch_id,
        );

        let remainingUsed = usedQuantity;
        for (const detail of details) {
            const used = Math.min(remainingUsed, detail.take_quantity);
            await tx.usage_item_details.update({
                where: { id: detail.id },
                data: { used_quantity: used },
            });
            remainingUsed -= used;
        }

        if (remainingUsed > 0) 
            throw new ConflictException(`Used quantity exceeds take quantity for item ${itemId}`);
    }
    
    // === RPC ===
    async findById(id: number): Promise<UsageItemView> {
        const list = await this.findUsageItemById(id);
        if (!list) throw new NotFoundException('Usage item list not found');
        return toUsageItemView(list);
    }

    async findAll(q: FindUsageItemListQueryDto): Promise<Paginated<UsageItemView>> {
        const { page = 1, limit = 20 } = q;
        const where: Prisma.usage_item_listsWhereInput = {
            ...(q.userId && { creator_id: q.userId }),
            ...(q.taskId && { task_id: q.taskId }),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.usage_item_lists.count({ where }),
            this.prisma.usage_item_lists.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: this.include,
            }),
        ]);

        return {
            items: items.map(toUsageItemView),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateUsageItemListMsg): Promise<CreateUsageItemListResult> {
        const requestedItems = [...dto.requestedItems].sort(
            (a, b) => a.itemId - b.itemId,
        );

        const result = await this.prisma.$transaction(async tx => {
            for (const item of requestedItems) {
                await tx.$queryRaw`
                    SELECT id FROM items
                    WHERE id = ${item.itemId}
                    FOR UPDATE
                `;
            }

            const itemRows = await tx.items.findMany({
                where: { id: { in: requestedItems.map(item => item.itemId) }},
                select: { id: true, stock: true },
            });
            const stockByItemId = new Map(
                itemRows.map(item => [item.id, item.stock]),
            );
            
            const successfulItems: UsageItemCreateSuccess[] = [];
            const shortageItems: UsageItemCreateShortage[] = [];
            const notFoundItemIds: number[] = [];
            for (const requested of requestedItems) {
                const currentQuantity = stockByItemId.get(requested.itemId);
                if (currentQuantity === undefined) {
                    notFoundItemIds.push(requested.itemId);
                } else if (currentQuantity < requested.requestedQuantity) {
                    shortageItems.push({
                        itemId: requested.itemId,
                        currentQuantity,
                        requestedQuantity: requested.requestedQuantity,
                        shortageQuantity: requested.requestedQuantity - currentQuantity,
                    });
                } else {
                    successfulItems.push({
                        itemId: requested.itemId,
                        requestedQuantity: requested.requestedQuantity,
                        allocatedQuantity: requested.requestedQuantity,
                    });
                }
            }

            if (successfulItems.length === 0) {
                return {
                    list: null,
                    successfulItems,
                    shortageItems,
                    notFoundItemIds,
                };
            }

            const createdList = await tx.usage_item_lists.create({
                data: {
                    creator_id: actor.employeeId,
                    task_id: dto.taskId,
                },
                select: { id: true },
            });
            
            for (const item of successfulItems) {
                await this.allocateQuantity(
                    tx,
                    createdList.id,
                    item.itemId,
                    item.requestedQuantity,
                );
            }

            const list = await tx.usage_item_lists.findUnique({
                where: { id: createdList.id },
                include: this.include,
            });
            if (!list) throw new NotFoundException('Created usage item list could not be loaded');

            return {
                list,
                successfulItems,
                shortageItems,
                notFoundItemIds,
            };
        });
        
        const view = result.list ? toUsageItemView(result.list) : null;
        if (view) this.events.created(view, actor.sub);
        return {
            view,
            successfulItems: result.successfulItems,
            shortageItems: result.shortageItems,
            notFoundItemIds: result.notFoundItemIds,
        };
    }

    async updateList({ id, data, actor }: UpdateUsageItemListMsg): Promise<UpdateUsageItemListResult> {
        const requestedItems = [...data.items].sort(
            (a, b) => a.itemId - b.itemId,
        );

        if (requestedItems.some(
            item => item.quantityToAdd === undefined && item.used === undefined,
        )) {
            throw new BadRequestException('Each item update must specify quantityToAdd or used');
        }

        const result = await this.prisma.$transaction(async tx => {
            // khóa danh sách cho thao tác update
            await tx.$queryRaw`
                SELECT id FROM usage_item_lists
                WHERE id = ${id}
                FOR UPDATE
            `;

            const list = await tx.usage_item_lists.findUnique({
                where: { id }, include: this.include,
            });
            if (!list) throw new NotFoundException('Usage item list not found');
            if (actor.employeeId !== list.creator_id) 
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (list.is_blocked) 
                throw new ForbiddenException('Cannot update a blocked usage item list');

            const detailsByItemId = new Map<number, typeof list.usage_item_details>();
            for (const detail of list.usage_item_details) {
                const itemId = detail.batches.item_id;
                const details = detailsByItemId.get(itemId) ?? [];
                details.push(detail);
                detailsByItemId.set(itemId, details);
            }

            // khóa items trước khi đọc stock
            for (const item of requestedItems) {
                // nếu không có lấy thêm thì không cần khóa
                if (item.quantityToAdd === undefined) continue;

                await tx.$queryRaw`
                    SELECT id FROM items
                    WHERE id = ${item.itemId}
                    FOR UPDATE
                `;
            }

            const inventoryItems = await tx.items.findMany({
                where: { id: { in: requestedItems.map(item => item.itemId) }},
                select: { id: true, stock: true },
            });
            const stockByItemId = new Map(
                inventoryItems.map(item => [item.id, item.stock]),
            );

            const successfulItems: UpdateUsageItemListResult['successfulItems'] = [];
            const shortageItems: UsageItemCreateShortage[] = [];
            const notFoundItemIds: number[] = [];
            const notInListItemIds: number[] = [];

            // phân loại items không tồn tại, nằm ngoài danh sách, không đủ stock
            for (const requested of requestedItems) {
                const currentStock = stockByItemId.get(requested.itemId);
                if (currentStock === undefined) {
                    // item id không có trong db -> item không tồn tại
                    notFoundItemIds.push(requested.itemId);
                    continue;
                }

                const existingDetails = detailsByItemId.get(requested.itemId);
                if (!existingDetails && requested.quantityToAdd === undefined) {
                    notInListItemIds.push(requested.itemId);
                    continue;
                }
                if (!existingDetails && requested.used !== undefined) {
                    throw new BadRequestException(`Cannot set used quantity for item ${requested.itemId} before adding it`);
                }

                if (
                    requested.quantityToAdd !== undefined &&
                    currentStock < requested.quantityToAdd
                ) {
                    shortageItems.push({
                        itemId: requested.itemId,
                        currentQuantity: currentStock,
                        requestedQuantity: requested.quantityToAdd,
                        shortageQuantity: requested.quantityToAdd - currentStock,
                    });
                }
            }

            // phân phát items 
            for (const requested of requestedItems) {
                const currentStock = stockByItemId.get(requested.itemId);
                if (currentStock === undefined) continue;

                const existingDetails = detailsByItemId.get(requested.itemId);
                if (!existingDetails && requested.quantityToAdd === undefined) {
                    continue;
                }

                const hasEnoughStock =
                    requested.quantityToAdd === undefined ||
                    currentStock >= requested.quantityToAdd;
                const quantityToAdd = hasEnoughStock
                    ? (requested.quantityToAdd ?? 0)
                    : 0;
                const currentTake = existingDetails?.reduce(
                    (total, detail) => total + detail.take_quantity, 0,
                ) ?? 0;
                const newTake = currentTake + quantityToAdd;

                if (requested.used !== undefined && requested.used > newTake) {
                    throw new BadRequestException(`Used quantity exceeds take quantity for item ${requested.itemId}`);
                }

                if (quantityToAdd > 0) {
                    await this.allocateQuantity(tx, id, requested.itemId, quantityToAdd);
                }

                if (requested.used !== undefined) {
                    await this.setUsedQuantity(
                        tx,
                        id,
                        requested.itemId,
                        requested.used,
                    );
                }

                if (quantityToAdd > 0 || requested.used !== undefined) {
                    successfulItems.push({
                        itemId: requested.itemId,
                        addedToList: !existingDetails && quantityToAdd > 0,
                        quantityAdded: quantityToAdd,
                        ...(requested.used !== undefined && {
                            usedQuantity: requested.used,
                        }),
                    });
                }
            }

            const updatedList = await tx.usage_item_lists.findUnique({
                where: { id }, include: this.include,
            });
            if (!updatedList) 
                throw new NotFoundException('Updated usage item list could not be loaded');

            return {
                list: updatedList,
                successfulItems,
                shortageItems,
                notFoundItemIds,
                notInListItemIds,
            };
        });

        const view = toUsageItemView(result.list);
        if (result.successfulItems.length > 0) {
            this.events.itemsUpdated(
                view,
                result.successfulItems.map(item => item.itemId),
                actor.sub,
            );
        }

        return {
            view,
            successfulItems: result.successfulItems,
            shortageItems: result.shortageItems,
            notFoundItemIds: result.notFoundItemIds,
            notInListItemIds: result.notInListItemIds,
        };
    }

    async block({ id, actor }: BlockUsageItemListMsg): Promise<UsageItemView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM usage_item_lists
                WHERE id = ${id}
                FOR UPDATE
            `;
            const list = await tx.usage_item_lists.findUnique({
                where: { id },
                include: this.include,
            });
            if (!list) throw new NotFoundException('Usage item list not found');
            if (actor.employeeId !== list.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (list.is_blocked) return { list, newlyBlocked: false };

            // set used và tính returned để trả về batch gốc
            const allocations = list.usage_item_details.map(detail => {
                const usedQuantity = detail.used_quantity ?? detail.take_quantity;
                if (usedQuantity < 0 || usedQuantity > detail.take_quantity) {
                    throw new ConflictException(`Invalid used quantity for usage detail ${detail.id}`);
                }

                return {
                    detail,
                    itemId: detail.batches.item_id,
                    usedQuantity,
                    returnedQuantity: detail.take_quantity - usedQuantity,
                };
            });

            const returnedAllocations = allocations.filter(
                allocation => allocation.returnedQuantity > 0,
            );
            const itemIds = [...new Set(
                returnedAllocations.map(allocation => allocation.itemId),
            )].sort((a, b) => a - b);

            // khóa items 
            for (const itemId of itemIds) {
                await tx.$queryRaw`
                    SELECT id FROM items
                    WHERE id = ${itemId}
                    FOR UPDATE
                `;
            }

            const batches = await tx.batches.findMany({
                where: { id: { in: returnedAllocations.map(a => a.detail.batch_id) }},
                select: {
                    id: true,
                    item_id: true,
                    quantity: true,
                },
            });
            const batchById = new Map(batches.map(batch => [batch.id, batch]));
            const returnedByItemId = new Map<number, number>();

            for (const allocation of allocations) {
                if (allocation.detail.used_quantity === null) {
                    await tx.usage_item_details.update({
                        where: { id: allocation.detail.id },
                        data: { used_quantity: allocation.usedQuantity },
                    });
                }

                if (allocation.returnedQuantity === 0) continue;

                const batch = batchById.get(allocation.detail.batch_id);
                if (!batch || batch.item_id !== allocation.itemId) {
                    throw new ConflictException(`Batch ${allocation.detail.batch_id} is inconsistent`);
                }

                const batchUpdate = await tx.batches.updateMany({
                    where: {
                        id: batch.id,
                        item_id: allocation.itemId,
                        remain_quantity: { lte: batch.quantity - allocation.returnedQuantity },
                    },
                    data: {
                        remain_quantity: { increment: allocation.returnedQuantity },
                    },
                });
                if (batchUpdate.count !== 1) 
                    throw new ConflictException(`Cannot return quantity to batch ${batch.id}`);

                returnedByItemId.set(
                    allocation.itemId,
                    (returnedByItemId.get(allocation.itemId) ?? 0) +
                        allocation.returnedQuantity,
                );
            }

            // trả về stock về item tương ứng
            for (const [itemId, quantity] of [...returnedByItemId.entries()]
                .sort(([a], [b]) => a - b)) {
                const itemUpdate = await tx.items.updateMany({
                    where: { id: itemId },
                    data: { stock: { increment: quantity } },
                });
                if (itemUpdate.count !== 1) 
                    throw new ConflictException(`Cannot restore stock for item ${itemId}`);
            }

            const blockedList = await tx.usage_item_lists.update({
                where: { id },
                data: { is_blocked: true },
                include: this.include,
            });
            return { list: blockedList, newlyBlocked: true };
        });

        const view = toUsageItemView(result.list);
        // dùng newlyBlocked để ngăn không phát sự kiện nhiều lần 
        if (result.newlyBlocked) this.events.blocked(view, actor.sub);
        return view;
    }
}