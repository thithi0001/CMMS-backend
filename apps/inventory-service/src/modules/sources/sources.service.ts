import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import {
    CreateInventorySourceMsg,
    UpdateInventorySourceMsg,
    DeleteInventorySourceMsg,
    FindInventorySourceQueryDto,
    InventorySourceView,
    Paginated,
} from '@app/shared';
import { InventorySourceEventsPublisher } from '../../messaging/publishers/source-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toInventorySourceView } from '../views.mapper';

@Injectable()
export class InventorySourcesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: InventorySourceEventsPublisher,
    ) {}

    // === Nội bộ ===
    findSourceById(id: number) {
        return this.prisma.sources.findUnique({ where: { id }});
    }
    
    // === RPC ===
    async findById(id: number): Promise<InventorySourceView> {
        const source = await this.findSourceById(id);
        if (!source) throw new NotFoundException('Source not found');
        return toInventorySourceView(source);
    }

    async findAll(q: FindInventorySourceQueryDto): Promise<Paginated<InventorySourceView>> {
        const { page = 1, limit = 20 } = q;
        const where: Prisma.sourcesWhereInput = {
            ...(q.search && {
                OR: [
                    { code: { startsWith: q.search, mode: 'insensitive' }},
                    { name: { contains: q.search, mode: 'insensitive' }},
                ],
            }),
            ...(q.type && { type: q.type }),
        };

        const [total, sources] = await this.prisma.$transaction([
            this.prisma.sources.count({ where }),
            this.prisma.sources.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { code: 'asc' },
                    { name: 'asc' },
                ],
            }),
        ]);

        return {
            items: sources.map(toInventorySourceView),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateInventorySourceMsg): Promise<InventorySourceView> {
        const existed = await this.prisma.sources.findUnique({
            where: { code: dto.code },
            select: { id: true },
        });
        if (existed) throw new ConflictException('Source code already exists');

        const source = await this.prisma.sources.create({
            data: {
                name: dto.name,
                code: dto.code,
                type: dto.type,
            },
        });
        const view = toInventorySourceView(source);
        this.events.created(view, actor.sub);
        return view;
    }

    async update({ id, data, actor }: UpdateInventorySourceMsg): Promise<InventorySourceView> {
        const result = await this.prisma.$transaction(async tx => {
            if (data.type !== undefined) {
                await tx.$queryRaw`
                    SELECT id FROM sources
                    WHERE id = ${id}
                    FOR UPDATE
                `;
            }

            const source = await tx.sources.findUnique({ where: { id }});
            if (!source) throw new NotFoundException('Source not found');

            if (data.type !== undefined && data.type !== source.type) {
                const isUsed = await tx.items.findFirst({
                    where: {
                        OR: [
                            { manufacturer_id: id },
                            { supplier_id: id },
                        ],
                    },
                    select: { id: true },
                });
                if (isUsed) throw new ConflictException('Cannot change type of source that is in use');
            }
            
            if (data.code !== undefined && data.code !== source.code) {
                const codeOwner = await tx.sources.findUnique({
                    where: { code: data.code },
                    select: { id: true },
                });
                if (codeOwner && codeOwner.id !== id)
                    throw new ConflictException('Source code already exists');
            }

            const patch: Prisma.sourcesUpdateInput = {
                name: data.name,
                code: data.code,
                type: data.type,
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length)
                return { source, changedFields };

            const updated = await tx.sources.update({
                where: { id }, data: patch,
            });
            return { source: updated, changedFields };
        });

        const view = toInventorySourceView(result.source);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteInventorySourceMsg): Promise<InventorySourceView> {
        const deleted = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
            SELECT id FROM sources
            WHERE id = ${id}
            FOR UPDATE
            `;
            
            const source = await tx.sources.findUnique({ where: { id }});
            if (!source) throw new NotFoundException('Source not found');

            const isUsed = await tx.items.findFirst({
                where: {
                    OR: [
                        { manufacturer_id: id },
                        { supplier_id: id },
                    ],
                },
                select: { id: true },
            });
            if (isUsed) throw new ConflictException('Cannot delete source is in use');
            return tx.sources.delete({ where: { id }});
        });
        const view = toInventorySourceView(deleted);
        this.events.deleted(view, actor.sub);
        return view;
    }
}