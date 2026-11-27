import {
    BadRequestException,
    ConflictException,
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    AssignDeviceView, CreateAssignDeviceMsg, DeleteAssignDeviceMsg,
    FindAssignDeviceMsg,
    Paginated, RequestStatus, Role, UpdateAssignDeviceMsg,
} from '@app/shared';
import { AssignDevicesEventsPublisher } from '../../messaging/publishers/assign-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { toAssignDeviceView } from '../views.mapper';

@Injectable()
export class AssignDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
        private readonly events: AssignDevicesEventsPublisher,
    ) {}

    private readonly assignDeviceInclude = {
        categories: { select: { name: true }},
    } satisfies Prisma.assign_devicesInclude;

    async create({ dto, actor }: CreateAssignDeviceMsg): Promise<AssignDeviceView> {
        const category = await this.categoriesService.findById(dto.categoryId);

        const assign = await this.prisma.assign_devices.create({
            data: {
                creator_id: actor.sub,
                category_id: category.id,
                reason: dto.reason,
                require: dto.require,
            },
            include: this.assignDeviceInclude,
        });
        const view = toAssignDeviceView(assign);
        this.events.created(view, actor.sub);
        return view;
    }

    async findById(id: number): Promise<AssignDeviceView> {
        const assign = await this.prisma.assign_devices.findUnique({
            where: { id },
            include: this.assignDeviceInclude,
        });
        if (!assign) throw new NotFoundException('Assign device request not found');
        return toAssignDeviceView(assign);
    }

    async findAll({ q, actor }: FindAssignDeviceMsg): Promise<Paginated<AssignDeviceView>> {
        const { page = 1, limit = 20, status = RequestStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = (actor.roleCode === Role.ADMIN || actor.roleCode === Role.MANAGER) 
            ? q.userId : actor.employeeId;
        const where: Prisma.assign_devicesWhereInput = {
            status,
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { approver_id: userId },
                ],
            }),
            ...(q.categoryId && { category_id: q.categoryId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.assign_devices.count({ where }),
            this.prisma.assign_devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: this.assignDeviceInclude,
            }),
        ]);

        return { 
            items: items.map(toAssignDeviceView), 
            total, page, limit 
        };
    }

    async update({ id, data, actor }: UpdateAssignDeviceMsg): Promise<AssignDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM assign_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const assign = await tx.assign_devices.findUnique({
                where: { id }, 
                include: this.assignDeviceInclude,
            });
            if (!assign) throw new NotFoundException('Assign device request not found');
            if (assign.status !== RequestStatus.PENDING)
                throw new ForbiddenException('This assign device request has been confirmed');
            if (actor.employeeId !== assign.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            
            const category = data.categoryId? 
                await this.categoriesService.findById(data.categoryId) 
                : undefined;
            
            const patch: Prisma.assign_devicesUpdateInput = {
                reason: data.reason,
                require: data.require,
                ...(category && {
                    categories: { connect: { id: category.id }},
                }),
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length) 
                return { assign, changedFields };

            const updated = await tx.assign_devices.update({
                where: { id },
                data: patch,
                include: this.assignDeviceInclude,
            });

            return { assign: updated, changedFields };
        })
        const view = toAssignDeviceView(result.assign);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub);
        return view;
    }

    async confirm({ id, data, actor }: UpdateAssignDeviceMsg): Promise<AssignDeviceView> {
        if (!data.status) 
            throw new BadRequestException('Missing assign device request status');

        const updated = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM assign_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const assign = await tx.assign_devices.findUnique({
                where: { id }, 
                include: this.assignDeviceInclude,
            });
            if (!assign) throw new NotFoundException('Assign device request not found');
            if (assign.status !== RequestStatus.PENDING)
                throw new ForbiddenException('This assign device request has been confirmed');
            if (data.status === RequestStatus.PENDING)
                throw new ConflictException('Cannot pending an assign request status');

            return await tx.assign_devices.update({
                where: { id },
                data: {
                    status: data.status,
                    approver_id: actor.employeeId,
                    approved_at: new Date(),
                },
                include: this.assignDeviceInclude,
            });
        });

        const view = toAssignDeviceView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteAssignDeviceMsg): Promise<AssignDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM assign_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const assign = await tx.assign_devices.findUnique({
                where: { id }, 
                include: this.assignDeviceInclude,
            });
            if (!assign) throw new NotFoundException('Assign device request not found');
            if (actor.employeeId !== assign.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (assign.status !== RequestStatus.PENDING)
                throw new ForbiddenException('Forbid to delete this assign device request');

            await tx.assign_devices.delete({ where: { id }});
            return { assign };
        });

        const view = toAssignDeviceView(result.assign);
        this.events.deleted(view, actor.sub);
        return view;
    }
}
