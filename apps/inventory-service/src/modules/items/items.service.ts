import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateItemMsg,
    UpdateItemMsg,
    FindItemQueryDto,
    ItemView,
    Paginated,
    InventorySourceType,
} from '@app/shared';
import { ItemEventsPublisher } from '../../messaging/publishers/item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toItemView } from '../views.mapper';

@Injectable()
export class ItemsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: ItemEventsPublisher,
    ) {}

    // === Nội bộ ===
    findItemById(id: number) {
        return this.prisma.items.findUnique({ 
            where: { id },
            include: {
                sources_items_manufacturer_idTosources: true,
                sources_items_supplier_idTosources: true,
            },
        });
    }
    
    // === RPC ===
    async findById(id: number): Promise<ItemView> {
        const item = await this.findItemById(id);
        if (!item) throw new NotFoundException('Item not found');
        return toItemView(item);
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
                include: {
                    sources_items_manufacturer_idTosources: true,
                    sources_items_supplier_idTosources: true,
                },
            }),
        ]);

        return {
            items: items.map(toItemView),
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
                    img_url: dto.imgUrl,
                },
                include: {
                    sources_items_manufacturer_idTosources: true,
                    sources_items_supplier_idTosources: true,
                },
            });
        });
        const view = toItemView(item);
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
            img_url: data.imgUrl,
        };
        const changedFields = Object.entries(patch)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key);
        if (!changedFields.length) return item;
        
        const updated = await this.prisma.items.update({
            where: { id }, data: patch,
            include: {
                sources_items_manufacturer_idTosources: true,
                sources_items_supplier_idTosources: true,
            },
        });
        const view = toItemView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    // async updateStock(): Promise<ItemView> {
        
    // }

}