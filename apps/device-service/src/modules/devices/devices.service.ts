import {
    ConflictException, ForbiddenException, Injectable, NotFoundException,
    OnModuleDestroy
} from '@nestjs/common';
import {
    FindDeviceHistoryDto, FindDeviceQueryDto,
    CreateDeviceMsg, UpdateDeviceMsg, ChangeDeviceStateMsg,
    DeviceHistoryView, DeviceView,
    Paginated,
    DeviceSourceType,
    myParseDate,
    RequestDeviceImageUploadMsg,
    DeviceImageUploadTicket,
    ConfirmDeviceImageMsg,
    DeviceImageView,
    RemoveDeviceImageMsg,
} from '@app/shared';
import { FILE_PURPOSES, StorageService, UploadRejectedException } from '@app/storage';
import { DeviceEventsPublisher } from '../../messaging/publishers/device-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { isAllowedToChangeState } from '../device-state-machine';
import { toDeviceHistoryView, toDeviceView } from '../views.mapper';

@Injectable()
export class DevicesService implements OnModuleDestroy {
    private readonly cleanupInterval: ReturnType<typeof setInterval>;

    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
        private readonly events: DeviceEventsPublisher,
        private readonly storage: StorageService,
    ) {
        this.cleanupInterval = setInterval(
            () => void this.cleanupUploadingImages(),
            30 * 60 * 1000,
        );
    }

    private readonly deviceInclude = {
        categories: { select: { name: true } },
        sources_devices_manufacturer_idTosources: { select: { name: true } },
        sources_devices_supplier_idTosources: { select: { name: true } },
        device_images: {
            where: { status: 'ready' as const },
        },
    } satisfies Prisma.devicesInclude;

    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
    }

    private async toImageView(image: {
        id: number,
        object_key: string,
        file_name: string;
        mime_type: string;
    }): Promise<DeviceImageView> {
        const download = await this.storage.createDownloadUrl(image.object_key, {
            fileName: image.file_name,
            mimeType: image.mime_type,
        });;
        return { id: image.id, ...download };
    }
    
    private async toDeviceView(device: Parameters<typeof toDeviceView>[0]): Promise<DeviceView> {
        const view = toDeviceView(device);
        const images = await Promise.all(
            (device.device_images ?? []).map(image => this.toImageView(image)),
        );
        return { ...view, images };
    }

    private async cleanupUploadingImages() {
        const ttlSeconds = Number(process.env.PENDING_UPLOAD_TTL_SECONDS ?? 86400);
        const threshold = new Date(Date.now() - ttlSeconds * 1000);
        const images = await this.prisma.device_images.findMany({
            where: {
                status: 'uploading',
                created_at: { lt: threshold },
            },
        });

        for (const image of images) {
            await this.storage.deleteObject(image.object_key).catch(() => undefined);
            await this.prisma.device_images.delete({ where: { id: image.id } }).catch(() => undefined);
        }
    }

    // === RPC ===
    async create({ dto, actor }: CreateDeviceMsg): Promise<DeviceView> {
        const device = await this.prisma.$transaction(async tx => {
            const category = await this.categoriesService.findById(dto.categoryId);

            const sourceIds = [...new Set([
                dto.manufacturerId,
                dto.supplierId,
            ])].sort((a, b) => a - b);
            for (const sourceId of sourceIds) {
                await tx.$queryRaw`
                    SELECT id FROM sources
                    WHERE id = ${sourceId}
                    FOR UPDATE
                `;
            };

            const sources = await tx.sources.findMany({
                where: { id: { in: sourceIds }},
            });
            const manufacturer = sources.find(
                source => source.id === dto.manufacturerId,
            );
            const supplier = sources.find(
                source => source.id === dto.supplierId,
            );

            if (!manufacturer || !supplier)
                throw new NotFoundException('Manufacturer or Supplier not found');
            if (manufacturer.type !== DeviceSourceType.MANUFACTURER)
                throw new ConflictException('manufacturerId must belong to a MANUFACTURER');
            if (supplier.type !== DeviceSourceType.SUPPLIER)
                throw new ConflictException('supplierId must belong to a SUPPLIER');

            const purchasePrice = dto.purchasePrice === undefined ? undefined :
                new Prisma.Decimal(dto.purchasePrice);
            const originalCost = dto.originalCost === undefined ? undefined :
                new Prisma.Decimal(dto.originalCost);

            return await tx.devices.create({
                data: {
                    category_id: category.id,
                    manufacturer_id: manufacturer.id,
                    supplier_id: supplier.id,
                    code: dto.code,
                    model: dto.model,
                    serial_number: dto.serialNumber,
                    manufacture_date: myParseDate(dto.manufactureDate, 'manufacture date'),
                    purchase_date: myParseDate(dto.purchaseDate, 'purchase date'),
                    purchase_price: purchasePrice,
                    original_cost: originalCost ? originalCost : purchasePrice,
                    specifications: dto.specifications,
                    install_location: dto.installLocation,
                },
                include: this.deviceInclude,
            });
        });
        const view = await this.toDeviceView(device);
        this.events.created(view, actor.sub);
        return view;
    }

    async findAll(q: FindDeviceQueryDto): Promise<Paginated<DeviceView>> {
        const { page = 1, limit = 20, search } = q;
        const priceFilter = {
            ...(q.above !== undefined ? { gte: new Prisma.Decimal(q.above) } : {}),
            ...(q.below !== undefined ? { lte: new Prisma.Decimal(q.below) } : {}),
        };
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };

        const where: Prisma.devicesWhereInput = {
            ...(q.categoryId && { category_id: q.categoryId}),
            ...(q.manufacturerId && { manufacturer_id: q.manufacturerId}),
            ...(q.supplierId && { supplier_id: q.supplierId}),
            ...(q.state && { state: q.state }),
            ...(search && {
                OR: [
                    { code: { startsWith: search, mode: 'insensitive' }},
                    { model: { startsWith: search, mode: 'insensitive' }},
                    { serial_number: { startsWith: search, mode: 'insensitive' }},
                    { install_location: { contains: search, mode: 'insensitive' }},
                ],
            }),
            ...(Object.keys(priceFilter).length > 0 ? { purchase_price: priceFilter } : {}),
            ...(Object.keys(dateFilter).length > 0 ? { purchase_date: dateFilter } : {}),
        };

        const [total, devices] = await this.prisma.$transaction([
            this.prisma.devices.count({ where }),
            this.prisma.devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' },
                include: this.deviceInclude,
            }),
        ]);
        
        return {
            items: await Promise.all(devices.map(device => this.toDeviceView(device))),
            total, page, limit
        };
    }

    async findById(id: number): Promise<DeviceView> {
        const device = await this.prisma.devices.findUnique({
            where: { id }, include: this.deviceInclude,
        });
        if (!device) throw new NotFoundException('Device not found');
        return this.toDeviceView(device);
    }
    
    async update({ id, data, actor }: UpdateDeviceMsg): Promise<DeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            const current = await tx.devices.findUnique({
                where: { id },
                include: this.deviceInclude,
            });
            if (!current) throw new NotFoundException('Device not found');

            if (data.categoryId !== undefined)
                await this.categoriesService.findById(data.categoryId);

            const manufacturerId = data.manufacturerId ?? current.manufacturer_id;
            const supplierId = data.supplierId ?? current.supplier_id;
            const sourceIds = [...new Set([
                manufacturerId,
                supplierId,
            ])].sort((a, b) => a - b);
            for (const sourceId of sourceIds) {
                await tx.$queryRaw`
                    SELECT id FROM sources
                    WHERE id = ${sourceId}
                    FOR UPDATE
                `;
            }

            const sources = await tx.sources.findMany({
                where: { id: { in: sourceIds }},
            });
            const manufacturer = sources.find(
                source => source.id === manufacturerId,
            );
            const supplier = sources.find(
                source => source.id === supplierId,
            );

            if (!manufacturer || !supplier)
                throw new NotFoundException('Manufacturer or Supplier not found');
            if (manufacturer.type !== DeviceSourceType.MANUFACTURER)
                throw new ConflictException('manufacturerId must belong to a MANUFACTURER');
            if (supplier.type !== DeviceSourceType.SUPPLIER)
                throw new ConflictException('supplierId must belong to a SUPPLIER');

            const newPurchasePrice = data.purchasePrice === undefined ? undefined :
                new Prisma.Decimal(data.purchasePrice);
            const newOriginalCost = data.originalCost === undefined ? undefined :
                new Prisma.Decimal(data.originalCost);

            const patch: Prisma.devicesUpdateInput = {
                ...(data.categoryId && {
                    categories: { connect: { id: data.categoryId }},
                }),
                ...(data.manufacturerId && {
                    sources_devices_manufacturer_idTosources: { connect: { id: data.manufacturerId }},
                }),
                ...(data.supplierId && {
                    sources_devices_supplier_idTosources: { connect: { id: data.supplierId }},
                }),
                code: data.code,
                model: data.model,
                serial_number: data.serialNumber,
                manufacture_date: myParseDate(data.manufactureDate, 'manufacture date'),
                purchase_date: myParseDate(data.purchaseDate, 'purchase date'),
                purchase_price: newPurchasePrice,
                original_cost: newOriginalCost,
                specifications: data.specifications,
                install_location: data.installLocation,
            };
            const changedFields = Object.entries(patch)
                .filter(([, value]) => value !== undefined)
                .map(([key]) => key);
            if (!changedFields.length)
                return { device: current, changedFields };

            const updated = await tx.devices.update({
                where: { id },
                data: patch,
                include: this.deviceInclude,
            });
            return { device: updated, changedFields };
        });
        const view = await this.toDeviceView(result.device);
        if (result.changedFields.length)
            this.events.updated(view, result.changedFields, actor.sub);
        return view;
    }

    async changeStage({ id, newState, actor }: ChangeDeviceStateMsg): Promise<DeviceView> {
        const result = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`
                SELECT id FROM devices
                WHERE id = ${id}
                FOR UPDATE
            `;
            const current = await tx.devices.findUnique({
                where: { id }, select: { id: true, state: true },
            });
            if (!current) throw new NotFoundException('Device not found');

            if (!isAllowedToChangeState(current.state, newState))
                throw new ConflictException(`
                    Cannot change device state 
                    from ${current.state} to ${newState}
                `);

            const updated = await tx.devices.update({
                where: { id }, data: { state: newState },
                include: this.deviceInclude,
            });
            await tx.device_activity_histories.create({
                data: {
                    device_id: id,
                    old_state: current.state,
                    new_state: newState,
                },
            });

            return { updated, oldState: current.state };
        });
        const view = await this.toDeviceView(result.updated);
        this.events.stateChanged(view, result.oldState, actor.sub);
        return view;
    }

    async getHistory(q: FindDeviceHistoryDto): Promise<Paginated<DeviceHistoryView>> {
        const { page = 1, limit = 20 } = q;

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

    async requestImageUpload({ id, dto, actor }: RequestDeviceImageUploadMsg): Promise<DeviceImageUploadTicket> {
        const existed = await this.prisma.devices.findUnique({ 
            where: { id }, select: { id: true },
        });
        if (!existed) throw new NotFoundException('Device not found');

        const { objectKey, ticket } = await this.storage.createUpload({
            purpose: FILE_PURPOSES.DEVICE_IMAGE,
            fileName: dto.fileName,
            mimeType: dto.mimeType,
            sizeBytes: dto.sizeBytes,
        });
        const image = await this.prisma.device_images.create({
            data: {
                device_id: id,
                object_key: objectKey,
                file_name: dto.fileName,
                mime_type: dto.mimeType,
                size_bytes: BigInt(dto.sizeBytes),
                uploaded_by: actor.sub,
            },
        });

        return { imageId: image.id, ...ticket };
    }

    async confirmImageUpload({ id, imageId }: ConfirmDeviceImageMsg): Promise<DeviceImageView> {
        const image = await this.prisma.device_images.findFirst({
            where: { id: imageId, device_id: id },
        });
        if (!image) throw new NotFoundException('Device image not found');
        if (image.status === 'ready') return this.toImageView(image);

        let sizeBytes: number;
        try {
            ({ sizeBytes } = await this.storage.verifyUpload({
                objectKey: image.object_key,
                purpose: FILE_PURPOSES.DEVICE_IMAGE,
                mimeType: image.mime_type,
            }));
        } catch (error) {
            if (error instanceof UploadRejectedException) {
                await this.prisma.device_images.delete({
                    where: { id: imageId },
                }).catch(() => undefined);
            }
            throw error;
        }

        const updated = await this.prisma.device_images.update({
            where: { id: imageId },
            data: {
                status: 'ready',
                size_bytes: BigInt(sizeBytes),
            },
        });
        return this.toImageView(updated);
    }

    async removeImage({ id, imageId }: RemoveDeviceImageMsg) {
        const image = await this.prisma.device_images.findFirst({
            where: { id: imageId, device_id: id },
        });
        if (!image) throw new NotFoundException('Device image not found');

        await this.storage.deleteObject(image.object_key);
        await this.prisma.device_images.delete({ where: { id: imageId } });
        return { message: 'Device image removed' };
    }
}
