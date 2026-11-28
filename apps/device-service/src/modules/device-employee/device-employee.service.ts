import {
    ConflictException,
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateDeviceEmployeeMsg, DeviceEmployeeView, DeviceState, 
    FindDeviceEmployeeMsg, 
    myParseDate, 
    Paginated, Role, UpdateDeviceEmployeeMsg,
} from '@app/shared';
import { DeviceEmployeeEventsPublisher } from '../../messaging/publishers/device-employee-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDeviceEmployeeView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';
import { isAllowedToChangeState } from '../device-state-machine';

@Injectable()
export class DeviceEmployeeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: DeviceEmployeeEventsPublisher,
    ) {}

    private readonly deviceEmployeeInclude = {
        devices: { select: { code: true }},
    } satisfies Prisma.device_employeeInclude;

    async create({ dto, actor }: CreateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        const inUse = await this.prisma.device_employee.findFirst({
            where: {
                device_id: dto.deviceId,
                is_returned: false,
            },
            select: { id: true },
        });
        if (inUse) throw new ConflictException('Device is in use');
        
        const newState = DeviceState.IN_USE;
        const deviceEmployee = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM devices
                WHERE id = ${dto.deviceId} 
                FOR UPDATE
            `;
            
            const deviceCurrentState = (await this.devicesService.findById(dto.deviceId)).state;
            if (!isAllowedToChangeState(deviceCurrentState, DeviceState.IN_USE))
                throw new ConflictException(`
                    Cannot change device state 
                    from ${deviceCurrentState} to ${newState}
                `);
            await tx.devices.update({
                where: { id: dto.deviceId },
                data: { state: newState },
            });

            return await tx.device_employee.create({
                data: {
                    device_id: dto.deviceId,
                    employee_id: dto.employeeId,
                    approver_id: actor.employeeId,
                    assigned_at: myParseDate(dto.assignedAt, 'assigned at') 
                        || new Date(),
                },
                include: this.deviceEmployeeInclude,
            })
        });

        const view = toDeviceEmployeeView(deviceEmployee);
        this.events.created(view, actor.sub);
        return view;
    }

    async findById(id: number): Promise<DeviceEmployeeView> {
        const deviceEmployee = await this.prisma.device_employee.findUnique({
            where: { id },
            include: this.deviceEmployeeInclude,
        });
        if (!deviceEmployee) throw new NotFoundException('Device employee not found');
        return toDeviceEmployeeView(deviceEmployee);
    }

    async findAll({ q, actor }: FindDeviceEmployeeMsg): Promise<Paginated<DeviceEmployeeView>> {
        const { page = 1, limit = 20, isReturned = false, me = true } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const canViewAll = (actor.roleCode === Role.ADMIN || actor.roleCode === Role.MANAGER);
        const userId = me || !canViewAll ? actor.employeeId : q.userId;
        const where: Prisma.device_employeeWhereInput = {
            is_returned: isReturned,
            ...(userId && {
                OR: [
                    { employee_id: userId },
                    { approver_id: userId },
                ],
            }),
            ...(q.deviceId && { device_id: q.deviceId }),
            ...(Object.keys(dateFilter).length > 0 ? { assigned_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.device_employee.count({ where }),
            this.prisma.device_employee.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { assigned_at: 'desc' },
                include: this.deviceEmployeeInclude,
            }),
        ]);

        return { 
            items: items.map(toDeviceEmployeeView), 
            total, page, limit 
        };
    }

    async return({ id, data, actor }: UpdateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        const newState = data.newState || DeviceState.AVAILABLE;
        const updated = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM device_employee
                WHERE id = ${id} 
                FOR UPDATE
            `;
            
            const existed = await tx.device_employee.findUnique({
                where: { id }, 
                select: { is_returned: true, device_id: true },
            });
            if (!existed) throw new NotFoundException('Device employee not found');
            if (existed.is_returned)
                throw new ForbiddenException('Device has been returned');
            
            await tx.$queryRaw`
                SELECT id FROM devices
                WHERE id = ${existed.device_id} 
                FOR UPDATE
            `;

            const deviceCurrentState = (await this.devicesService.findById(existed.device_id)).state;
            if (!isAllowedToChangeState(deviceCurrentState, DeviceState.IN_USE))
                throw new ConflictException(`
                    Cannot change device state 
                    from ${deviceCurrentState} to ${newState}
                `);
            await tx.devices.update({
                where: { id: existed.device_id },
                data: { state: newState },
            });
            
            return await tx.device_employee.update({
                where: { id },
                data: {
                    is_returned: true,
                    returned_at: new Date(data.returnedAt),
                },
                include: this.deviceEmployeeInclude,
            });
        });

        const view = toDeviceEmployeeView(updated);
        this.events.returned(view, newState, actor.sub);
        return view;
    }
}
