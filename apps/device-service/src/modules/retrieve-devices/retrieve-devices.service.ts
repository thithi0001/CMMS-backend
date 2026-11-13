import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateRetrieveDeviceMsg, DeleteRetrieveDeviceMsg, FindRetrieveDeviceQueryDto,
    Paginated, RetrieveDeviceView, Role, UpdateRetrieveDeviceMsg,
} from '@app/shared';
import { RetrieveDevicesEventsPublisher } from '../../messaging/publishers/retrieve-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toRetrieveDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class RetrieveDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: RetrieveDevicesEventsPublisher,
    ) {}

    async create({ dto, actor }: CreateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const device = await this.devicesService.findById(dto.deviceId);
        if (actor.roleCode === Role.TECHNICIAN)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const retrieve = await this.prisma.retrieve_devices.create({
            data: {
                device_id: device.id,
                creator_id: actor.employeeId,
                confirmer_id: dto.confirmerId,
                required_time: new Date(dto.requiredTime),
            },
            include: { devices: { select: { code: true } } },
        });
        const view = toRetrieveDeviceView(retrieve);
        this.events.created(view, actor.sub);
        return view;
    }

    private findRetrieveDeviceById(id: number) {
        return this.prisma.retrieve_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true } } },
        });
    }

    async findById(id: number): Promise<RetrieveDeviceView> {
        const retrieve = await this.findRetrieveDeviceById(id);
        if (!retrieve) throw new NotFoundException('Retrieve device request not found');
        return toRetrieveDeviceView(retrieve);
    }

    async findAll(q: FindRetrieveDeviceQueryDto): Promise<Paginated<RetrieveDeviceView>> {
        const { page = 1, limit = 20, isConfirmed = false } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.retrieve_devicesWhereInput = {
            is_confirmed: isConfirmed,
            ...(q.userId && {
                OR: [
                    { creator_id: q.userId },
                    { confirmer_id: q.userId },
                ],
            }),
            ...(Object.keys(dateFilter).length > 0 ? { required_time: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.retrieve_devices.count({ where }),
            this.prisma.retrieve_devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { devices: { select: { code: true } } },
            }),
        ]);

        return { items: items.map(toRetrieveDeviceView), total, page, limit };
    }

    async update({ id, data, actor }: UpdateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const retrieve = await this.findById(id);
        if (actor.employeeId !== retrieve.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (retrieve.isConfirmed)
            throw new ForbiddenException('Forbid to update retrieve device request');

        const patch = {
            is_confirmed: data.isConfirmed,
            required_time: data.requiredTime === undefined ? undefined : new Date(data.requiredTime),
            handover_id: data.handoverId === undefined ? undefined : data.handoverId,
        };
        const changedFields = Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key);
        if (!changedFields.length)
            return retrieve;

        const updated = await this.prisma.retrieve_devices.update({
            where: { id: retrieve.id },
            data: patch,
            include: { devices: { select: { code: true } } },
        });
        const view = toRetrieveDeviceView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const retrieve = await this.findById(id);
        if (actor.employeeId !== retrieve.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (retrieve.isConfirmed)
            throw new ForbiddenException('Forbid to delete this retrieve device request');
        
        await this.prisma.retrieve_devices.delete({ where: { id } });
        this.events.deleted(retrieve, actor.sub);
        return retrieve;
    }
}
