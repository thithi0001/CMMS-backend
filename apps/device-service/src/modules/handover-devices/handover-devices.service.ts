import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateHandoverDeviceMsg, DeleteHandoverDeviceMsg, FindHandoverDeviceMsg,
    HandoverDeviceView, myParseDate, Paginated, Role, UpdateHandoverDeviceMsg,
} from '@app/shared';
import { HandoverDevicesEventsPublisher } from '../../messaging/publishers/handover-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toHandoverDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';
import { MaintenanceTasksClient } from '../../messaging/clients/maintenance-tasks.client';

@Injectable()
export class HandoverDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: HandoverDevicesEventsPublisher,
        private readonly tasks: MaintenanceTasksClient,
    ) {}

    private readonly handoverDeviceInclude = {
        devices: { select: { code: true }},
    } satisfies Prisma.handover_devicesInclude;

    async create({ dto, actor }: CreateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        if (dto.taskId) 
            await this.tasks.findById(dto.taskId);

        const device = await this.devicesService.findById(dto.deviceId);

        const handover = await this.prisma.handover_devices.create({
            data: {
                device_id: device.id,
                creator_id: actor.employeeId,
                deliver_id: dto.deliverId,
                receiver_id: dto.receiverId,
                type: dto.type,
                task_id: dto.taskId,
            },
            include: this.handoverDeviceInclude,
        });
        const view = toHandoverDeviceView(handover);
        this.events.created(view, actor.sub);
        return view;
    }

    async findById(id: number): Promise<HandoverDeviceView> {
        const handover = await this.prisma.handover_devices.findUnique({
            where: { id },
            include: this.handoverDeviceInclude,
        });
        if (!handover) throw new NotFoundException('Handover device request not found');
        return toHandoverDeviceView(handover);
    }

    async findAll({ q, actor }: FindHandoverDeviceMsg): Promise<Paginated<HandoverDeviceView>> {
        const { page = 1, limit = 20, isHandoverd = false, me = true } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = me ? actor.employeeId : q.userId;
        const where: Prisma.handover_devicesWhereInput = {
            is_handovered: isHandoverd,
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { deliver_id: userId },
                    { receiver_id: userId },
                ],
            }),
            ...(q.deviceId && { device_id: q.deviceId }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(q.type && { type: q.type }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.handover_devices.count({ where }),
            this.prisma.handover_devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: this.handoverDeviceInclude,
            }),
        ]);

        return { items: items.map(toHandoverDeviceView), total, page, limit };
    }

    async update({ id, data, actor }: UpdateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM handover_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const handover = await tx.handover_devices.findUnique({
                where: { id },
                include: this.handoverDeviceInclude,
            });
            if (!handover) throw new NotFoundException('Handover device request not found');
            if (handover.is_handovered)
                throw new ForbiddenException('This handover device request has been confirmed');
            if (actor.employeeId !== handover.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');

            const patch: Prisma.handover_devicesUpdateInput = {
                deliver_id: data.deliverId,
                receiver_id: data.receiverId,
                type: data.type,
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length) 
                return { handover, changedFields };
            
            const updated = await this.prisma.handover_devices.update({
                where: { id },
                data: patch,
                include: this.handoverDeviceInclude,
            });

            return { handover: updated, changedFields };
        });
        const view = toHandoverDeviceView(result.handover);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub);
        return view;
    }

    async confirm({ id, data, actor }: UpdateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM handover_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const handover = await tx.handover_devices.findUnique({
                where: { id },
                select: { is_handovered: true, receiver_id: true },
            });
            if (!handover) throw new NotFoundException('Handover device request not found');
            if (handover.is_handovered)
                throw new ForbiddenException('This handover device request has been confirmed');
            if (actor.employeeId !== handover.receiver_id)
                throw new UnauthorizedException('Unauthorized to perform this action');

            const updated = await this.prisma.handover_devices.update({
                where: { id },
                data: {
                    is_handovered: true,
                    handovered_at: myParseDate(data.handoveredAt, 'handover at') || new Date(),
                },
                include: this.handoverDeviceInclude,
            });

            return { handover: updated };
        });
        const view = toHandoverDeviceView(result.handover);
        this.events.confirmed(view, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM handover_devices
                WHERE id = ${id}
                FOR UPDATE
            `;

            const handover = await tx.handover_devices.findUnique({
                where: { id },
                include: this.handoverDeviceInclude,
            });
            if (!handover) throw new NotFoundException('Handover device request not found');
            if (handover.is_handovered)
                throw new ForbiddenException('This handover device request has been confirmed');
            if (actor.employeeId !== handover.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');

            await tx.retrieve_devices.updateMany({
                where: { handover_id: id },
                data: { handover_id: null },
            });
            await tx.handover_devices.delete({ where: { id }});
            return { handover };
        });

        const view = toHandoverDeviceView(result.handover);
        this.events.deleted(view, actor.sub);
        return view;
    }
}
