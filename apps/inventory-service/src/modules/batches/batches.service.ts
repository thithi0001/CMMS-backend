import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    BatchView,
    CreateBatchMsg,
    FindBatchMsg,
    Paginated,
    Role,
    myParseDate,
} from '@app/shared';
import { BatchEventsPublisher } from '../../messaging/publishers/batch-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toBatchView } from '../views.mapper';

@Injectable()
export class BatchesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: BatchEventsPublisher,
    ) {}

    private readonly include: Prisma.batchesInclude = {
        items: { select: {
            id: true,
            name: true,
            code: true,
        }},
    };

    // === Nội bộ ===
    findBatchById(id: number) {
        return this.prisma.batches.findUnique({ 
            where: { id }, include: this.include,
        });
    }
    
    // === RPC ===
    async findById(id: number): Promise<BatchView> {
        const batch = await this.findBatchById(id);
        if (!batch) throw new NotFoundException('Batch not found');
        return toBatchView(batch);
    }

    async findAll({ q, actor }: FindBatchMsg): Promise<Paginated<BatchView>> {
        const { page = 1, limit = 20, userId = actor.employeeId } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.batchesWhereInput = {
            ...(actor.roleCode === Role.MANAGER && {
                creator_id: userId,
            }),
            ...(q.itemId && { item_id: q.itemId }),
            ...(Object.keys(dateFilter).length > 0 ? { import_date: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.batches.count({ where }),
            this.prisma.batches.findMany({ 
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { items: { code: 'asc' }},
                    { import_date: 'desc' },
                ],
                include: this.include,
            }),
        ]);

        return {
            items: items.map(toBatchView),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateBatchMsg): Promise<BatchView> {
        const batch = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM items
                WHERE id = ${dto.itemId}
                FOR UPDATE
            `;

            const item = await tx.items.findUnique({ 
                where: { id: dto.itemId },
                select: { id: true },
            });
            if (!item) throw new NotFoundException('Item not found');

            const unit_price = Prisma.Decimal(dto.unitPrice);
            const batch = await tx.batches.create({
                data: {
                    creator_id: actor.employeeId,
                    item_id: dto.itemId,
                    quantity: dto.quantity,
                    remain_quantity: dto.quantity,
                    unit_price,
                    import_date: new Date(dto.importDate),
                    total_price: unit_price.mul(dto.quantity),
                },
                include: this.include,
            });
            
            await tx.items.update({
                where: { id: batch.item_id },
                data: { stock: { increment: batch.quantity }},
            });

            return batch;
        });
        const view = toBatchView(batch);
        this.events.created(view, actor.sub);
        return view;
    }

    // async increase({ id, quantity }) {}
    // async decrease({ id, quantity }) {}
}