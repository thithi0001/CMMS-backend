import {
    ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    CreateDisposeDeviceMsg, DisposeDeviceView, DeviceState,
    Paginated, Role,
    FindDisposeDeviceMsg,
} from '@app/shared';
import { DisposeDevicesEventsPublisher } from '../../messaging/publishers/dispose-devices-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDisposeDeviceView } from '../views.mapper';
import { DevicesService } from '../devices/devices.service';
import { isAllowedToChangeState } from '../device-state-machine';

@Injectable()
export class DisposeDevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly devicesService: DevicesService,
        private readonly events: DisposeDevicesEventsPublisher,
    ) {}

    private readonly disposeDeviceInclude = {
        devices: { select: { code: true }},
    } satisfies Prisma.disposal_devicesInclude;

    async create({ dto, actor }: CreateDisposeDeviceMsg): Promise<DisposeDeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM devices 
                WHERE id = ${dto.deviceId}
                FOR UPDATE
            `;

            const device = await this.devicesService.findById(dto.deviceId);
            if (!isAllowedToChangeState(device.state, DeviceState.DISPOSED))
                throw new ConflictException(`Cannot change device state from ${device.state} to ${DeviceState.DISPOSED}`);
            await tx.devices.update({
                where: { id: device.id },
                data: { state: DeviceState.DISPOSED },
            });

            const disposal = await tx.disposal_devices.create({
                data: {
                    id: device.id,
                    creator_id: actor.employeeId,
                    disposal_date: new Date(dto.disposalDate),
                    disposal_value: Prisma.Decimal(dto.disposalValue),
                    reason: dto.reason,
                },
                include: this.disposeDeviceInclude,
            });
            return { disposal };
        });

        const view = toDisposeDeviceView(result.disposal);
        this.events.disposed(view, actor.sub);
        return view;
    }

    async findById(id: number): Promise<DisposeDeviceView> {
        const disposal = await this.prisma.disposal_devices.findUnique({
            where: { id },
            include: this.disposeDeviceInclude,
        });
        if (!disposal) throw new NotFoundException('Dispose device form not found');
        return toDisposeDeviceView(disposal);
    }

    async findAll({ q, actor }: FindDisposeDeviceMsg): Promise<Paginated<DisposeDeviceView>> {
        const { page = 1, limit = 20, me = false } = q;
        const priceFilter = {
            ...(q.above !== undefined ? { gte: new Prisma.Decimal(q.above) } : {}),
            ...(q.below !== undefined ? { lte: new Prisma.Decimal(q.below) } : {}),
        };
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        // chỉ có admin và manager mới xem gọi được route này
        const userId = me ? actor.employeeId : q.userId;
        const where: Prisma.disposal_devicesWhereInput = {
            ...(userId && { creator_id: userId }),
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
                    { devices: { code: 'asc' }},
                    { created_at: 'desc' },
                ],
                include: this.disposeDeviceInclude,
            }),
        ]);

        return { 
            items: items.map(toDisposeDeviceView), 
            total, page, limit 
        };
    }
}
