import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateDeviceEmployeeMsg, DeviceEmployeeView, DeviceState,
    FindDeviceEmployeeQueryDto, Paginated, Role, UpdateDeviceEmployeeMsg,
} from '@app/shared';
import { DeviceEmployeeEventsPublisher } from '../../messaging/publishers/device-employee-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDeviceEmployeeView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class DeviceEmployeeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: DeviceEmployeeEventsPublisher,
    ) {}

    async create({ dto, actor }: CreateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        if (actor.roleCode !== Role.ADMIN && actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const device = await this.devicesService.findById(dto.deviceId);
        if (device.state !== DeviceState.AVAILABLE)
            throw new ForbiddenException('Forbid to create device employee');

        const [_, employeeDevice] = await this.prisma.$transaction([
            this.prisma.devices.update({
                where: { id: device.id },
                data: { state: DeviceState.IN_USE },
            }),
            this.prisma.device_employee.create({
                data: {
                    device_id: device.id,
                    employee_id: dto.employeeId,
                    approver_id: actor.employeeId,
                    assigned_at: new Date(dto.assignedAt),
                },
                include: { devices: { select: { code: true } } },
            }),
        ]);
        const view = toDeviceEmployeeView(employeeDevice);
        this.events.created(view, actor.sub);
        return view;
    }

    private findDeviceEmployeeById(id: number) {
        return this.prisma.device_employee.findUnique({
            where: { id },
            include: { devices: { select: { code: true } } },
        });
    }

    async findById(id: number): Promise<DeviceEmployeeView> {
        const employeeDevice = await this.findDeviceEmployeeById(id);
        if (!employeeDevice) throw new NotFoundException('Device employee not found');
        return toDeviceEmployeeView(employeeDevice);
    }

    async findAll(q: FindDeviceEmployeeQueryDto): Promise<Paginated<DeviceEmployeeView>> {
        const { page = 1, limit = 20, isReturned = false } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.device_employeeWhereInput = {
            is_returned: isReturned,
            ...(q.userId && {
                OR: [
                    { employee_id: q.userId },
                    { approver_id: q.userId },
                ],
            }),
            ...(Object.keys(dateFilter).length > 0 ? { assigned_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.device_employee.count({ where }),
            this.prisma.device_employee.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { assigned_at: 'desc' },
                include: { devices: { select: { code: true } } },
            }),
        ]);

        return { items: items.map(toDeviceEmployeeView), total, page, limit };
    }

    async update({ id, data, actor }: UpdateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        const employeeDevice = await this.findById(id);
        if (actor.employeeId !== employeeDevice.approverId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (employeeDevice.isReturned) throw new ForbiddenException('Forbid to perform this action');

        const [updated, _] = await this.prisma.$transaction([
            this.prisma.device_employee.update({
                where: { id },
                data: {
                    is_returned: true,
                    returned_at: new Date(data.returnedAt),
                },
                include: { devices: { select: { code: true } } },
            }),
            this.prisma.devices.update({
                where: { id },
                data: { state: DeviceState.AVAILABLE },
            }),
        ]);
        const changedFields = ['is_returned', 'returned_at'];
        const view = toDeviceEmployeeView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }
}
