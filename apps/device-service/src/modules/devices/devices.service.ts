import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import {
    ChangeDeviceStateMsg,
    CreateDeviceDto,
    CreateDeviceMsg,
    DeviceHistoryView,
    DeviceView,
    FindDeviceHistoryDto,
    FindDeviceQueryDto,
    Paginated,
    UpdateDeviceMsg,
} from '@app/shared';
import { DeviceEventsPublisher } from '../../messaging/publishers/device-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDeviceHistoryView, toDeviceView } from '../views.mapper';
import { SourcesService } from '../sources/sources.service';
import { CategoriesService } from '../categories/categories.service';
import { SourceType } from '@app/shared/types/device.enum';

@Injectable()
export class DevicesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
        private readonly sourcesService: SourcesService,
        private readonly events: DeviceEventsPublisher,
    ) {}

    // === Nội bộ ===
    include = {
        categories: { select: { name: true } },
        sources_devices_manufacturer_idTosources: { select: { name: true } },
        sources_devices_supplier_idTosources: { select: { name: true } },
    };
    
    findDeviceById(id: number) {
        return this.prisma.devices.findUnique({
            where: { id },
            include: this.include,
        });
    }

    async createDevice(dto: CreateDeviceDto): Promise<DeviceView> {
        const category = await this.categoriesService.findById(dto.categoryId);
        const manufacturer = await this.sourcesService.findById(dto.manufacturerId);
        if (manufacturer.type !== SourceType.MANUFACTURER)
            throw new ConflictException('manufacturerId must identify a manufacturer');
        const supplier = await this.sourcesService.findById(dto.supplierId);
        if (supplier.type !== SourceType.SUPPLIER)
            throw new ConflictException('supplierId must identify a supplier');

        const purchasePrice = dto.purchasePrice === undefined ? undefined :
            new Prisma.Decimal(dto.purchasePrice);
        const originalCost = dto.originalCost === undefined ? undefined :
            new Prisma.Decimal(dto.originalCost);
        
        const device = await this.prisma.devices.create({
            data: {
                category_id: category.id,
                manufacturer_id: manufacturer.id,
                supplier_id: supplier.id,
                code: dto.code,
                model: dto.model,
                serial_number: dto.serialNumber,
                manufacture_date: dto.manufactureDate,
                purchase_date: dto.purchaseDate,
                purchase_price: purchasePrice,
                original_cost: originalCost ? originalCost : purchasePrice,
                specifications: dto.specifications,
                img_url: dto.imgUrl,
                install_location: dto.installLocation,
            },
            include: this.include,
        });

        return toDeviceView(device);
    }

    // === RPC ===
    async create({ dto, actor }: CreateDeviceMsg): Promise<DeviceView> {
        const device = await this.createDevice(dto);
        this.events.created(device, actor.sub);
        return device;
    }

    async findAll(q: FindDeviceQueryDto): Promise<Paginated<DeviceView>> {
        const {
            page = 1,
            limit = 20,
            search
        } = q;
        const priceFilter = {
            ...(q.above !== undefined
                ? { gte: new Prisma.Decimal(q.above) } : {}
            ),
            ...(q.below !== undefined
                ? { lte: new Prisma.Decimal(q.below) } : {}
            ),
        };
        const dateFilter = {
            ...(q.from !== undefined
                ? { gte: new Date(q.from) } : {}
            ),
            ...(q.to !== undefined
                ? { lte: new Date(q.to) } : {}
            ),
        };

        const where: Prisma.devicesWhereInput = {
            // category,
            // manufacturer,
            // supplier,
            ...(q.state && { state: q.state }),
            ...(search && {
                OR: [
                    { code: { startsWith: search, mode: 'insensitive' }},
                    { model: { startsWith: search, mode: 'insensitive' }},
                    { serial_number: { startsWith: search, mode: 'insensitive' }},
                    { install_location: { contains: search, mode: 'insensitive' }},
                ],
            }),
            ...(Object.keys(priceFilter).length > 0
                ? { purchase_price: priceFilter } : {}
            ),
            ...(Object.keys(dateFilter).length > 0
                ? { purchase_date: dateFilter } : {}
            ),
        };

        const [total, devices] = await this.prisma.$transaction([
            this.prisma.devices.count({ where }),
            this.prisma.devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' },
                include: this.include,
            }),
        ]);
        
        return {
            items: devices.map(toDeviceView),
            total, page, limit
        };
    }

    async findById(id: number): Promise<DeviceView> {
        const device = await this.findDeviceById(id);
        if (!device)
            throw new NotFoundException('Device not found');
        return toDeviceView(device);
    }
    
    async update({ id, data, actor }: UpdateDeviceMsg): Promise<DeviceView> {
        const device = await this.findById(id);
        if (data.categoryId)
            await this.categoriesService.findById(data.categoryId);
        if (data.manufacturerId)
            if (SourceType.MANUFACTURER !==
                (await this.sourcesService.findById(data.manufacturerId)).type)
                throw new ConflictException('manufacturerId must identify a manufacturer');
        if (data.supplierId)
            if (SourceType.SUPPLIER !==
                (await this.sourcesService.findById(data.supplierId)).type)
                throw new ConflictException('supplierId must identify a supplier');

        const newPurchasePrice = data.purchasePrice === undefined ? undefined :
            new Prisma.Decimal(data.purchasePrice);
        const newOriginalCost = data.originalCost === undefined ? undefined :
            new Prisma.Decimal(data.originalCost);

        const patch = {
            category_id: data.categoryId,
            manufacturer_id: data.manufacturerId,
            supplier_id: data.supplierId,
            code: data.code,
            model: data.model,
            serial_number: data.serialNumber,
            manufacture_date: data.manufactureDate,
            purchase_date: data.purchaseDate,
            purchase_price: newPurchasePrice,
            original_cost: newOriginalCost,
            specifications: data.specifications,
            img_url: data.imgUrl,
            install_location: data.installLocation,
            updated_at: new Date(),
        };

        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const updated = await this.prisma.devices.update({
            where: { id: device.id },
            data: patch,
            include: this.include,
        });

        if (changedFields.length)
            this.events.updated(updated.id, updated.code, changedFields, actor.sub);

        return toDeviceView(updated);
    }

    async changeStage({ id, newState, actor }: ChangeDeviceStateMsg): Promise<DeviceView> {
        const device = await this.findById(id);
        
        const now = new Date();
        await this.prisma.devices.update({
            where: { id: device.id },
            data: { 
                state: newState,
                updated_at: now,
            },
        });
        this.events.stateChanged(id, device.code, device.state, newState, actor.sub);

        device.state = newState;
        device.updatedAt = now.toISOString();
        return device;
    }

    async getHistory(q: FindDeviceHistoryDto): Promise<Paginated<DeviceHistoryView>> {
        const {
            page = 1,
            limit = 20,
        } = q;

        const [total, history] = await this.prisma.$transaction([
            this.prisma.device_activity_histories.count({ where: { device_id: q.deviceId } }),
            this.prisma.device_activity_histories.findMany({
                where: { device_id: q.deviceId },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
        ]);

        return {
            items: history.map(toDeviceHistoryView),
            total, page, limit
        };
    }
}
