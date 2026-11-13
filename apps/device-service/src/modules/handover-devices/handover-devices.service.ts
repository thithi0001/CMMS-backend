import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateHandoverDeviceMsg, DeleteHandoverDeviceMsg, FindHandoverDeviceQueryDto,
    HandoverDeviceView, Paginated, UpdateHandoverDeviceMsg,
} from '@app/shared';
import { HandoverDevicesEventsPublisher } from '../../messaging/publishers/handover-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toHandoverDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class HandoverDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: HandoverDevicesEventsPublisher,
    ) {}

    async create({ dto, actor }: CreateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const device = await this.devicesService.findById(dto.deviceId);

        const handover = await this.prisma.handover_devices.create({
            data: {
                device_id: device.id,
                creator_id: actor.employeeId,
                deliver_id: dto.deliverId,
                receiver_id: dto.receiverId,
                type: dto.type,
            },
            include: { devices: { select: { code: true } } },
        });
        const view = toHandoverDeviceView(handover);
        this.events.created(view, actor.sub);
        return view;
    }

    private findHandoverDeviceById(id: number) {
        return this.prisma.handover_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true } } },
        });
    }

    async findById(id: number): Promise<HandoverDeviceView> {
        const handover = await this.findHandoverDeviceById(id);
        if (!handover) throw new NotFoundException('Handover device request not found');
        return toHandoverDeviceView(handover);
    }

    async findAll(q: FindHandoverDeviceQueryDto): Promise<Paginated<HandoverDeviceView>> {
        const { page = 1, limit = 20, isHandoverd = false } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.handover_devicesWhereInput = {
            is_handovered: isHandoverd,
            ...(q.userId && {
                OR: [
                    { deliver_id: q.userId },
                    { receiver_id: q.userId },
                ],
            }),
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
                include: { devices: { select: { code: true } } },
            }),
        ]);

        return { items: items.map(toHandoverDeviceView), total, page, limit };
    }

    async update({ id, data, actor }: UpdateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const handover = await this.findById(id);
        if (handover.isHandoverd)
            throw new ForbiddenException('Forbid to update handover device request');
        if (actor.employeeId !== handover.receiverId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const patch = {
            is_handovered: true,
            handovered_at: data.handoveredAt !== undefined ? new Date(data.handoveredAt) : new Date()
        };
        const changedFields = Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key);
        if (!changedFields.length) return handover;

        const updated = await this.prisma.handover_devices.update({
            where: { id },
            data: patch,
            include: { devices: { select: { code: true } } },
        });
        const view = toHandoverDeviceView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const handover = await this.findById(id);
        if (handover.isHandoverd)
            throw new ForbiddenException('Forbid to delete handover device request');
        if (actor.employeeId !== handover.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.$transaction([
            this.prisma.retrieve_devices.updateMany({
                where: { handover_id: handover.id },
                data: { handover_id: null },
            }),
            this.prisma.handover_devices.delete({ where: { id } }),
        ]);
        this.events.deleted(handover, actor.sub);
        return handover;
    }
}
