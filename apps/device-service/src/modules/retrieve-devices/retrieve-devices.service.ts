import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateRetrieveDeviceMsg, DeleteRetrieveDeviceMsg,
    FindDeviceEmployeeQueryDto,
    FindRetrieveDeviceMsg,
    Paginated, RetrieveDeviceActionMsg, RetrieveDeviceView, Role, UpdateRetrieveDeviceMsg,
} from '@app/shared';
import { RetrieveDevicesEventsPublisher } from '../../messaging/publishers/retrieve-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toRetrieveDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';
import { DeviceEmployeeService } from '../device-employee/device-employee.service';

@Injectable()
export class RetrieveDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly deviceEmployeeService: DeviceEmployeeService,
        private readonly events: RetrieveDevicesEventsPublisher,
    ) {}

    private readonly retrieveDeviceInclude = {
        devices: { select: { code: true }},
    } satisfies Prisma.retrieve_devicesInclude;

    async create({ dto, actor }: CreateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        await this.devicesService.findById(dto.deviceId);
        
        const q: FindDeviceEmployeeQueryDto = {
            limit: 1,
            me: true,
            isReturned: false,
            deviceId: dto.deviceId,
        };
        const result = (await this.deviceEmployeeService.findAll({ q, actor }))[0];
        
        let confirmerId: number | undefined = undefined;
        if (actor.roleCode === Role.EMPLOYEE) {
            confirmerId = result.approverId
        } else if (actor.roleCode === Role.MANAGER) {
            confirmerId = result.employeeId
        }
        if (!confirmerId) throw new NotFoundException('Confirmer not found');
        
        const retrieve = await this.prisma.retrieve_devices.create({
            data: {
                device_id: dto.deviceId,
                creator_id: actor.employeeId,
                confirmer_id: confirmerId,
                required_time: new Date(dto.requiredTime),
            },
            include: this.retrieveDeviceInclude,
        });
        const view = toRetrieveDeviceView(retrieve);
        this.events.created(view, actor.sub, actor.roleCode);
        return view;
    }

    async findById(id: number): Promise<RetrieveDeviceView> {
        const retrieve = await this.prisma.retrieve_devices.findUnique({
            where: { id },
            include: this.retrieveDeviceInclude,
        });
        if (!retrieve) throw new NotFoundException('Retrieve device request not found');
        return toRetrieveDeviceView(retrieve);
    }

    async findAll({ q, actor }: FindRetrieveDeviceMsg): Promise<Paginated<RetrieveDeviceView>> {
        const { page = 1, limit = 20, isConfirmed = false, me = false } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const canViewAll = (actor.roleCode === Role.ADMIN || actor.roleCode === Role.MANAGER);
        const userId = me || !canViewAll ? actor.employeeId : q.userId;
        const where: Prisma.retrieve_devicesWhereInput = {
            is_confirmed: isConfirmed,
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { confirmer_id: userId },
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
                include: this.retrieveDeviceInclude,
            }),
        ]);

        return { items: items.map(toRetrieveDeviceView), total, page, limit };
    }

    async update({ id, data, actor }: UpdateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM retrieve_devices
                WHERE id = ${id}
                FOR UPDATE
            `;
            const retrieve = await tx.retrieve_devices.findUnique({
                where: { id }, include: this.retrieveDeviceInclude,
            });
            if (!retrieve) throw new NotFoundException('Retrieve device request not found');
            if (actor.employeeId !== retrieve.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (retrieve.is_confirmed && data.handoverId === undefined)
                throw new ForbiddenException('Forbid to update retrieve device request');

            const patch: Prisma.retrieve_devicesUpdateInput = {
                required_time: data.requiredTime === undefined ? undefined : new Date(data.requiredTime),
                ...(data.handoverId && {
                    handover_devices: { connect: { id: data.handoverId }},
                }),
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length) 
                return { retrieve, changedFields };
            
            const updated = await this.prisma.retrieve_devices.update({
                where: { id: retrieve.id },
                data: patch,
                include: this.retrieveDeviceInclude,
            });
            return { retrieve: updated, changedFields }
        });
        const view = toRetrieveDeviceView(result.retrieve);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub, actor.roleCode);
        return view;
    }

    async confirm({ id, actor }: RetrieveDeviceActionMsg): Promise<RetrieveDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM retrieve_devices
                WHERE id = ${id}
                FOR UPDATE
            `;
            const retrieve = await tx.retrieve_devices.findUnique({
                where: { id }, select: { confirmer_id: true, is_confirmed: true },
            });
            if (!retrieve) throw new NotFoundException('Retrieve device request not found');
            if (actor.employeeId !== retrieve.confirmer_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (retrieve.is_confirmed)
                throw new ForbiddenException('Retrieve device request has been confirmed');

            const updated = await tx.retrieve_devices.update({
                where: { id }, data: { is_confirmed: true },
                include: this.retrieveDeviceInclude,
            });
            return { updated };
        });

        const view = toRetrieveDeviceView(result.updated);
        this.events.confirmed(view, actor.sub, actor.roleCode);
        return view;
    }

    async delete({ id, actor }: DeleteRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
             await tx.$queryRaw`
                SELECT id FROM retrieve_devices
                WHERE id = ${id}
                FOR UPDATE
            `;
            const retrieve = await tx.retrieve_devices.findUnique({
                where: { id }, include: this.retrieveDeviceInclude,
            });
            if (!retrieve) throw new NotFoundException('Retrieve device request not found');
            if (actor.employeeId !== retrieve.creator_id)
                throw new UnauthorizedException('Unauthorized to perform this action');
            if (retrieve.is_confirmed)
                throw new ForbiddenException('Forbid to update retrieve device request');

            await tx.retrieve_devices.delete({ where: { id }});
            return { retrieve };
        });
        const view = toRetrieveDeviceView(result.retrieve);
        this.events.deleted(view, actor.sub, actor.roleCode);
        return view;
    }
}
