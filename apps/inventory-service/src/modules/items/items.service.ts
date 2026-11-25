import {
    ConflictException, Injectable, NotFoundException, OnModuleDestroy
} from '@nestjs/common';
import {
    CreateItemMsg, UpdateItemMsg,
    ConfirmItemImageMsg,
    RemoveItemImageMsg, RequestItemImageUploadMsg,
    FindItemQueryDto,
    ItemView, ItemImageView,
    ItemImageUploadTicket,
    Paginated,
    InventorySourceType,
} from '@app/shared';
import {
    FILE_PURPOSES,
    StorageService,
    UploadRejectedException,
} from '@app/storage';
import { ItemEventsPublisher } from '../../messaging/publishers/item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toItemView } from '../views.mapper';

@Injectable()
export class ItemsService implements OnModuleDestroy {
    private readonly cleanupInterval: ReturnType<typeof setInterval>;

    constructor(
        private readonly prisma: PrismaService,
        private readonly events: ItemEventsPublisher,
        private readonly storage: StorageService,
    ) {
        this.cleanupInterval = setInterval(
            () => void this.cleanupUploadingImages(),
            30 * 60 * 1000,
        );
    }

    private readonly itemInclude = {
        sources_items_manufacturer_idTosources: true,
        sources_items_supplier_idTosources: true,
        item_images: {
            where: { status: 'ready' as const },
        },
    } satisfies Prisma.itemsInclude;

    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
    }
    
    // === RPC ===
    async findById(id: number): Promise<ItemView> {
        const item = await this.prisma.items.findUnique({
            where: { id }, include: this.itemInclude,
        });
        if (!item) throw new NotFoundException('Item not found');
        return this.toItemView(item);
    }
    
    async findAll(q: FindItemQueryDto): Promise<Paginated<ItemView>> {
        const { page = 1, limit = 20, isLow = false } = q;
        const where: Prisma.itemsWhereInput = {
            ...(q.search && {
                OR: [
                    { code: { startsWith: q.search, mode: 'insensitive' }},
                    { name: { contains: q.search, mode: 'insensitive' }},
                ],
            }),
            ...(q.manufacturerId && { manufacturer_id: q.manufacturerId }),
            ...(q.supplierId && { supplier_id: q.supplierId }),
            ...(isLow && { stock: { 
                lte: this.prisma.items.fields.minimum_stock,
            }}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.items.count({ where }),
            this.prisma.items.findMany({ 
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' },
                include: this.itemInclude,
            }),
        ]);

        return {
            items: await Promise.all(items.map(item => this.toItemView(item))),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateItemMsg): Promise<ItemView> {
        const item = await this.prisma.$transaction(async tx => {
            const sourceIds = [...new Set([
                dto.manufacturerId,
                dto.supplierId,
            ])].sort((a, b) => a - b);

            // Khóa theo thứ tự ID để giảm nguy cơ deadlock.
            for (const sourceId of sourceIds) {
                await tx.$queryRaw`
                    SELECT id FROM sources
                    WHERE id = ${sourceId}
                    FOR UPDATE
                `;
            };

            const sources = await tx.sources.findMany({
                where: { id: { in: sourceIds }},
            });

            const manufacturer = sources.find(
                source => source.id === dto.manufacturerId,
            );
            const supplier = sources.find(
                source => source.id === dto.supplierId,
            );

            if (!manufacturer || !supplier)
                throw new NotFoundException('Manufacturer or Supplier not found');
            if (manufacturer.type !== InventorySourceType.MANUFACTURER)
                throw new ConflictException('manufacturerId must belong to a MANUFACTURER');
            if (supplier.type !== InventorySourceType.SUPPLIER)
                throw new ConflictException('supplierId must belong to a SUPPLIER');

            return tx.items.create({
                data: {
                    manufacturer_id: dto.manufacturerId,
                    supplier_id: dto.supplierId,
                    name: dto.name,
                    code: dto.code,
                    unit: dto.unit,
                    description: dto.description,
                    minimum_stock: dto.minimum,
                },
                include: this.itemInclude,
            });
        });
        const view = await this.toItemView(item);
        this.events.created(view, actor.sub);
        return view;
    }

    async update({ id, data, actor }: UpdateItemMsg): Promise<ItemView> {
        const item = await this.findById(id);
        if (data.code !== undefined && data.code !== item.code){
            const codeOwner = await this.prisma.items.findUnique({
                where: { code: data.code },
                select: { id: true },
            });
            if (codeOwner && codeOwner.id !== id)
                throw new ConflictException('Item code already exists');
        }

        const patch: Prisma.itemsUpdateInput = {
            name: data.name,
            code: data.code,
            unit: data.unit,
            description: data.description,
            minimum_stock: data.minimum,
        };
        const changedFields = Object.entries(patch)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key);
        if (!changedFields.length) return item;
        
        const updated = await this.prisma.items.update({
            where: { id }, data: patch,
            include: this.itemInclude,
        });
        const view = await this.toItemView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async requestImageUpload({ itemId, dto, actor }: RequestItemImageUploadMsg): Promise<ItemImageUploadTicket> {
        await this.assertItemExists(itemId);

        const { objectKey, ticket } = await this.storage.createUpload({
            purpose: FILE_PURPOSES.ITEM_IMAGE,
            fileName: dto.fileName,
            mimeType: dto.mimeType,
            sizeBytes: dto.sizeBytes,
        });
        const image = await this.prisma.item_images.create({
            data: {
                item_id: itemId,
                object_key: objectKey,
                file_name: dto.fileName,
                mime_type: dto.mimeType,
                size_bytes: BigInt(dto.sizeBytes),
                uploaded_by: actor.sub,
            },
        });

        return { imageId: image.id, ...ticket };
    }

    async confirmImageUpload({ itemId, imageId }: ConfirmItemImageMsg): Promise<ItemImageView> {
        const image = await this.prisma.item_images.findFirst({
            where: { id: imageId, item_id: itemId },
        });
        if (!image) throw new NotFoundException('Item image not found');
        if (image.status === 'ready') return this.toImageView(image);

        let sizeBytes: number;
        try {
            ({ sizeBytes } = await this.storage.verifyUpload({
                objectKey: image.object_key,
                purpose: FILE_PURPOSES.ITEM_IMAGE,
                mimeType: image.mime_type,
            }));
        } catch (error) {
            if (error instanceof UploadRejectedException) {
                await this.prisma.item_images.delete({
                    where: { id: imageId },
                }).catch(() => undefined);
            }
            throw error;
        }

        const updated = await this.prisma.item_images.update({
            where: { id: imageId },
            data: {
                status: 'ready',
                size_bytes: BigInt(sizeBytes),
            },
        });
        return this.toImageView(updated);
    }

    async removeImage({ itemId, imageId }: RemoveItemImageMsg) {
        const image = await this.prisma.item_images.findFirst({
            where: { id: imageId, item_id: itemId },
        });
        if (!image) throw new NotFoundException('Item image not found');

        await this.storage.deleteObject(image.object_key);
        await this.prisma.item_images.delete({ where: { id: imageId } });
        return { message: 'Item image removed' };
    }

    private async assertItemExists(itemId: number) {
        const item = await this.prisma.items.findUnique({
            where: { id: itemId },
            select: { id: true },
        });
        if (!item) throw new NotFoundException('Item not found');
    }

    private async toItemView(item: Parameters<typeof toItemView>[0]): Promise<ItemView> {
        const view = toItemView(item);
        const images = await Promise.all(
            (item.item_images ?? []).map(image => this.toImageView(image)),
        );
        return { ...view, images };
    }

    private async toImageView(image: {
        id: number;
        object_key: string;
        file_name: string;
        mime_type: string;
    }): Promise<ItemImageView> {
        const download = await this.storage.createDownloadUrl(image.object_key, {
            fileName: image.file_name,
            mimeType: image.mime_type,
        });
        return { id: image.id, ...download };
    }

    private async cleanupUploadingImages() {
        const ttlSeconds = Number(process.env.PENDING_UPLOAD_TTL_SECONDS ?? 86400);
        const threshold = new Date(Date.now() - ttlSeconds * 1000);
        const images = await this.prisma.item_images.findMany({
            where: {
                status: 'uploading',
                created_at: { lt: threshold },
            },
        });

        for (const image of images) {
            await this.storage.deleteObject(image.object_key).catch(() => undefined);
            await this.prisma.item_images.delete({ where: { id: image.id } }).catch(() => undefined);
        }
    }
}