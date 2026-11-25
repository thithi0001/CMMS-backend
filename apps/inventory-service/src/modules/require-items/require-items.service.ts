import {
    ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    RequireItemView,
    Paginated,
    FindRequireItemQueryDto,
    CreateRequireItemMsg,
    UpdateRequireItemMsg,
    DeleteRequireItemMsg,
    RequireItemActionMsg,
} from '@app/shared';
import { RequireItemEventsPublisher } from '../../messaging/publishers/require-item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toRequireItemView } from '../views.mapper';

@Injectable()
export class RequireItemsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: RequireItemEventsPublisher,
    ) {}

    private readonly include: Prisma.require_itemsInclude = {
        items: { select: {
            id: true,
            name: true,
            code: true,
        }},
    };
    // === Nội bộ ===
    findRequireItemById(id: number) {
        return this.prisma.require_items.findUnique({ 
            where: { id }, include: this.include,
        });
    }
    
    // === RPC ===
    async findById(id: number): Promise<RequireItemView> {
        const r = await this.findRequireItemById(id);
        if (!r) throw new NotFoundException('Require items request not found');
        return toRequireItemView(r);
    }

    async findAll(q: FindRequireItemQueryDto): Promise<Paginated<RequireItemView>> {
        const { page = 1, limit = 20, isConfirmed = false, isFulfilled = false } = q;
        const where: Prisma.require_itemsWhereInput = {
            is_confirmed: isConfirmed,
            is_fulfilled: isFulfilled,
            ...(q.userId && {
                OR: [
                    { creator_id: q.userId },
                    { confirmer_id: q.userId },
                ],
            }),
            ...(q.itemId && { item_id: q.itemId }),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.require_items.count({ where }),
            this.prisma.require_items.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { is_confirmed: 'asc' }, // false -> true
                    { is_fulfilled: 'asc' },
                    { created_at: 'desc' },
                ],
                include: this.include,
            }),
        ]);

        return {
            items: items.map(toRequireItemView),
            total, page, limit
        };
    }

    async create({ dto, actor }: CreateRequireItemMsg): Promise<RequireItemView> {
        const r = await this.prisma.require_items.create({
            data: {
                creator_id: actor.employeeId,
                item_id: dto.itemId,
                reason: dto.reason,
                requires: dto.requires,
                quantity: dto.quantity,
            },
            include: this.include,
        });
        const view = toRequireItemView(r);
        this.events.created(view, actor.sub);
        return view;
    }

    async update({ id, data, actor }: UpdateRequireItemMsg): Promise<RequireItemView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM require_items
                WHERE id = ${id}
                FOR UPDATE
            `;
            const r = await tx.require_items.findUnique({
                where: { id }, include: this.include,
            });
            if (!r) throw new NotFoundException('Require items request not found');
            if (actor.employeeId !== r.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');

            if (typeof data.itemId === 'number' && data.itemId !== r.item_id) {
                const item = await tx.items.findUnique({ 
                    where: { id: data.itemId },
                    select: { id: true },
                });
                if (!item) throw new NotFoundException('Item not found');
            }

            const patch: Prisma.require_itemsUpdateInput = {
                ...(data.itemId === undefined 
                    ? {} 
                    : data.itemId === null 
                        ? { items: { disconnect: true }} 
                        : { items: { connect: { id: data.itemId }}}
                ),
                reason: data.reason,
                requires: data.requires,
                quantity: data.quantity,
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length)
                return { r, changedFields };

            const updated = await tx.require_items.update({
                where: { id }, data: patch,
                include: this.include,
            });
            return { r: updated, changedFields };
        });

        const view = toRequireItemView(result.r);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub);
        return view;
    }

    async confirm({ id, actor }: RequireItemActionMsg): Promise<RequireItemView> {
        const confirmed = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM require_items
                WHERE id = ${id}
                FOR UPDATE
            `;

            const r = await tx.require_items.findUnique({
                where: { id }, include: this.include,
            });
            if (!r) throw new NotFoundException('Require items request not found');
            if (r.is_confirmed) throw new ForbiddenException('This require items request has been confirmed');

            return await tx.require_items.update({
                where: { id },
                data: { 
                    confirmer_id: actor.employeeId,
                    is_confirmed: true,
                },
                include: this.include,
            });
        });
        const view = toRequireItemView(confirmed);
        this.events.confirmed(view, actor.sub);
        return view;
    }

    async fulfill({ id, actor }: RequireItemActionMsg): Promise<RequireItemView> {
        const confirmed = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM require_items
                WHERE id = ${id}
                FOR UPDATE
            `;

            const r = await tx.require_items.findUnique({
                where: { id }, include: this.include,
            });
            if (!r) throw new NotFoundException('Require items request not found');
            if (r.is_fulfilled) throw new ForbiddenException('This require items request has been fulfilled');

            return await tx.require_items.update({
                where: { id },
                data: { is_fulfilled: true },
                include: this.include,
            });
        });
        const view = toRequireItemView(confirmed);
        this.events.fulfilled(view, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteRequireItemMsg): Promise<RequireItemView> {
        const deleted = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM require_items
                WHERE id = ${id}
                FOR UPDATE
            `;

            const r = await tx.require_items.findUnique({
                where: { id }, include: this.include,
            });
            if (!r) throw new NotFoundException('Require items request not found');

            if (actor.employeeId !== r.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            
            return await tx.require_items.delete({ 
                where: { id }, include: this.include,
            });
        });
        const view = toRequireItemView(deleted);
        this.events.deleted(view, actor.sub);
        return view;
    }
}