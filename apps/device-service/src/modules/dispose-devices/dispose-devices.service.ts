import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateDisposeDeviceMsg, DisposeDeviceView, DeviceState,
    FindDisposeDeviceQueryDto, Paginated, Role,
} from '@app/shared';
import { DisposeDevicesEventsPublisher } from '../../messaging/publishers/dispose-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDisposeDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class DisposeDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: DisposeDevicesEventsPublisher,
    ) {}

    async create({ dto, actor }: CreateDisposeDeviceMsg): Promise<DisposeDeviceView> {
        if (actor.roleCode !== Role.ADMIN && actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const device = await this.devicesService.findById(dto.deviceId);
        const excluded: DeviceState[] = [
            DeviceState.AVAILABLE,
            DeviceState.AWAITING_DISPOSED,
        ];
        if (!excluded.includes(device.state))
            throw new ForbiddenException('Forbid to dispose this device');

        const [_, disposal] = await this.prisma.$transaction([
            this.prisma.devices.update({
                where: { id: device.id },
                data: { state: DeviceState.DISPOSED },
            }),
            this.prisma.disposal_devices.create({
                data: {
                    id: device.id,
                    creator_id: actor.employeeId,
                    disposal_date: new Date(dto.disposalDate),
                    disposal_value: Prisma.Decimal(dto.disposalValue),
                    reason: dto.reason,
                },
                include: { devices: { select: { code: true } } },
            }),
        ]);
        const view = toDisposeDeviceView(disposal);
        this.events.disposed(view, actor.sub);
        return view;
    }

    private findDisposeDeviceById(id: number) {
        return this.prisma.disposal_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true } } },
        });
    }

    async findById(id: number): Promise<DisposeDeviceView> {
        const disposal = await this.findDisposeDeviceById(id);
        if (!disposal) throw new NotFoundException('Dispose device form not found');
        return toDisposeDeviceView(disposal);
    }

    async findAll(q: FindDisposeDeviceQueryDto): Promise<Paginated<DisposeDeviceView>> {
        const { page = 1, limit = 20 } = q;
        const priceFilter = {
            ...(q.above !== undefined ? { gte: new Prisma.Decimal(q.above) } : {}),
            ...(q.below !== undefined ? { lte: new Prisma.Decimal(q.below) } : {}),
        };
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const where: Prisma.disposal_devicesWhereInput = {
            ...(q.userId && { creator_id: q.userId }),
            ...(Object.keys(priceFilter).length > 0 ? { disposal_value: priceFilter } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { disposal_date: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.disposal_devices.count({ where }),
            this.prisma.disposal_devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [
                    { disposal_date: 'desc' },
                    { created_at: 'desc' },
                ],
                include: { devices: { select: { code: true } } },
            }),
        ]);

        return { 
            items: items.map(toDisposeDeviceView), 
            total, page, limit 
        };
    }
}
