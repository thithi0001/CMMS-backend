import {
    BadRequestException,
    ConflictException,
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    AssignDeviceView, CreateAssignDeviceMsg, DeleteAssignDeviceMsg, FindAssignDeviceQueryDto,
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

    async create({ dto, actor }: CreateAssignDeviceMsg): Promise<AssignDeviceView> {
        const category = await this.categoriesService.findById(dto.categoryId);

        const assign = await this.prisma.assign_devices.create({
            data: {
                creator_id: actor.sub,
                category_id: category.id,
                reason: dto.reason,
                require: dto.require,
            },
            include: { categories: { select: { name: true } } },
        });
        const view = toAssignDeviceView(assign);
        this.events.created(view, actor.sub);
        return view;
    }

    private findAssignDeviceById(id: number) {
        return this.prisma.assign_devices.findUnique({
            where: { id },
            include: { categories: { select: { name: true } } },
        });
    }

    async findById(id: number): Promise<AssignDeviceView> {
        const assign = await this.findAssignDeviceById(id);
        if (!assign) throw new NotFoundException('Assign device request not found');
        return toAssignDeviceView(assign);
    }

    async findAll(q: FindAssignDeviceQueryDto): Promise<Paginated<AssignDeviceView>> {
        const { page = 1, limit = 20 } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.assign_devicesWhereInput = {
            ...(q.userId && {
                OR: [
                    { creator_id: q.userId },
                    { approver_id: q.userId },
                ],
            }),
            ...(q.status && { status: q.status }),
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
                include: { categories: { select: { name: true } } },
            }),
        ]);

        return { 
            items: items.map(toAssignDeviceView), 
            total, page, limit 
        };
    }

    async update({ id, data, actor }: UpdateAssignDeviceMsg): Promise<AssignDeviceView> {
        const assign = await this.findById(id);
        if (actor.employeeId !== assign.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (assign.status !== RequestStatus.PENDING)
            throw new ForbiddenException('Forbid to update this assign device request');
        const category = data.categoryId? await this.categoriesService.findById(data.categoryId) : undefined;

        const patch: Prisma.assign_devicesUpdateInput = {
            reason: data.reason,
            require: data.require,
            ...(category && {categories: { connect: { id: category.id }}}),
        };
        const changedFields = Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key);
        if (!changedFields.length) return assign;
        
        const updated = await this.prisma.assign_devices.update({
            where: { id },
            data: patch,
            include: { categories: { select: { name: true } } },
        });
        const view = toAssignDeviceView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async confirm({ id, data, actor }: UpdateAssignDeviceMsg): Promise<AssignDeviceView> {
        const assign = await this.findById(id);
        if (!data.status) return assign
        if (assign.status !== RequestStatus.PENDING)
            throw new ForbiddenException('Forbid to update this assign device request');
        if (data.status === RequestStatus.PENDING)
            throw new ConflictException('Cannot pending an assign device request');

        const patch: Prisma.assign_devicesUpdateInput = {
            status: data.status,
            approver_id: actor.employeeId,
            approved_at: new Date(),
        };
        const updated = await this.prisma.assign_devices.update({
            where: { id },
            data: patch,
            include: { categories: { select: { name: true } } },
        });
        const view = toAssignDeviceView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteAssignDeviceMsg): Promise<AssignDeviceView> {
        const assign = await this.findById(id);
        if (actor.employeeId !== assign.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (assign.status !== RequestStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this assign device request');
        
        await this.prisma.assign_devices.delete({ where: { id } });
        this.events.deleted(assign, actor.sub);
        return assign;
    }
}
