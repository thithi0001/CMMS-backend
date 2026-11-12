import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import {
    CreateAssignDeviceMsg,
    AssignDeviceView,
    FindAssignDeviceQueryDto,
    Paginated,
    UpdateAssignDeviceMsg,
    DeleteAssignDeviceMsg,
    Role,
    CreateRetrieveDeviceMsg,
    FindRetrieveDeviceQueryDto,
    UpdateRetrieveDeviceMsg,
    DeleteRetrieveDeviceMsg,
    CreateHandoverDeviceMsg,
    FindHandoverDeviceQueryDto,
    UpdateHandoverDeviceMsg,
    CreateDisposeDeviceMsg,
    FindDisposeDeviceQueryDto,
    CreateDeviceEmployeeMsg,
    FindDeviceEmployeeQueryDto,
    UpdateDeviceEmployeeMsg,
} from '@app/shared';
import { DeviceEventsPublisher } from '../../messaging/publishers/device-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { toAssignDeviceView } from '../views.mapper';
import { RequestStatus } from '@app/shared/types/device.enum';
import { DevicesService } from './devices.service';

@Injectable()
export class DeviceActionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
        private readonly devicesService: DevicesService,
        private readonly events: DeviceEventsPublisher,
    ) {}

    // === ASSIGN ===
    async assign({ dto, actor }: CreateAssignDeviceMsg ): Promise<AssignDeviceView> {
        const category = await this.categoriesService.findById(dto.categoryId);

        const assign = await this.prisma.assign_devices.create({
            data: {
                creator_id: actor.sub,
                category_id: category.id,
                reason: dto.reason,
                require: dto.require,
            },
            include: { categories: { select: { name: true }}},
        });

        const view = toAssignDeviceView(assign);
        this.events.assignDeviceRequested(view, actor.sub);
        return view;
    }

    findAssignDeviceById(id: number) {
        return this.prisma.assign_devices.findUnique({
            where: { id },
            include: { categories: { select: { name: true }}},
        });
    }

    async findADById(id: number): Promise<AssignDeviceView> {
        const a = await this.findAssignDeviceById(id);
        if (!a) throw new NotFoundException('Assign device request not found');
        return toAssignDeviceView(a);
    }

    async findAllAD(q: FindAssignDeviceQueryDto): Promise<Paginated<AssignDeviceView>> {
        const { page = 1, limit = 20 } = q;
        const dateFilter = {
            ...(q.from !== undefined? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined? { lte: new Date(q.to) } : {}),
        };
        const where : Prisma.assign_devicesWhereInput = {
            ...(q.userId && {
                OR: [
                    { creator_id: q.userId },
                    { approver_id: q.userId },
                ],
            }),
            ...(q.status && { status: q.status }),
            ...(q.categoryId && { category_id: q.categoryId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        }
        
        const [total, items] = await this.prisma.$transaction([
            this.prisma.assign_devices.count({ where }),
            this.prisma.assign_devices.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: { categories: { select: { name: true }}},
            }),
        ]);
        
        return {
            items: items.map(toAssignDeviceView),
            total, page, limit
        };
    }

    async updateAD({ id, data, actor }: UpdateAssignDeviceMsg): Promise<AssignDeviceView> {
        const a = await this.findADById(id);
        if (a.status !== RequestStatus.PENDING)
            throw new ForbiddenException('Forbid to update this assign device request');

        let patch = {};
        if (actor.roleCode === Role.MANAGER) {
            if (!data.status || data.status === RequestStatus.PENDING)
                throw new ForbiddenException('Forbid to update this assign device request');
            
            patch = {
                status: data.status,
                approver_id: actor.employeeId,
                approved_at: new Date(),
                updated_at: new Date(),
            };
        } else if (actor.employeeId === a.creatorId) {
            patch = {
                reason: data.reason,
                require: data.require,
                updated_at: new Date(),
            };
        } else throw new ForbiddenException('Forbid to update this assign device request');
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const updated = await this.prisma.assign_devices.update({
            where: { id } ,
            data: patch,
            include: { categories: { select: { name: true }}},
        });

        const view = toAssignDeviceView(updated);
        if (changedFields.length)
            this.events.assignDeviceUpdated(view, changedFields, actor.sub);
        return view;
    }

    async deleteAD({ id, actor }: DeleteAssignDeviceMsg): Promise<AssignDeviceView> {
        const a = await this.findADById(id);
        if (actor.employeeId !== a.creatorId)
            if (a.status !== RequestStatus.PENDING && a.status !== RequestStatus.CANCEL) 
                throw new ForbiddenException('Forbid to delete this assign device request')
        await this.prisma.assign_devices.delete({ where: { id }});

        this.events.assignDeviceDeleted(a, actor.sub);
        return a;
    }

    // === RETRIEVE ===
    async retrieve({ dto, actor }: CreateRetrieveDeviceMsg): Promise<> {
        const device = await this.devicesService.findById(deviceId);
        chỉ có m và e là được tạo
        const retrieve = await this.prisma.retrieve_devices.create({
            data: {
                device_id: ,
                creator_id: ,
                confirmer_id: ,
                required_time: ,
            }
        });
        const view = to;
        this.events.retrieveDeviceRequested();
        return view;
    }

    findRetrieveDeviceById(id: number) {
        return this.prisma.handover_devices.findUnique({
            where: { id },
            include: device + handover
        });
    }

    async findRDById(id: number): Promise<> {
        const r = await this.findRetrieveDeviceById(id);
        if (!r) throw new NotFoundException('Retrieve device request not found');
        return to
    }

    async findAllRD(q: FindRetrieveDeviceQueryDto): Promise<Paginated<>> {
        const { page = 1, limit = 20, isConfirmed = false } = q;
        const dateFilter = {
            ...(q.from !== undefined? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined? { lte: new Date(q.to) } : {}),
        };
        const where : Prisma.retrieve_devicesWhereInput = {
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
                include: device + handover
            }),
        ]);

        return {
            items: items.map(to),
            total, page, limit
        };
    }

    async updateRD({ id, data, actor }: UpdateRetrieveDeviceMsg): Promise<> {
        let patch = {
            is_confirmed
            required_time
            handover_id
            updated_at
        }
    }

    async deleteRD({ id, actor }: DeleteRetrieveDeviceMsg): Promise<> {
        const r = await this.findRDById(id);
        if (actor.employeeId !== r.creatorId || r.isConfirmed)
            throw new ForbiddenException('Forbid to delete this retrieve device request');
        await this.prisma.retrieve_devices.delete({ where: { id }});
        this.events.retrieveDeviceDeleted();
        return r;
    }

    // === HANDOVER ===
    async handover({ dto, actor }: CreateHandoverDeviceMsg): Promise<> {
        const device = await this.devicesService.findById(deviceId);
        
        const h = await this.prisma.handover_devices.create({
            data: {

            },
            include: device
        });
        const view = to
        this.events.handoverDeviceRequested();
        return view;
    }

    findHandoverDeviceById(id: number) {
        return this.prisma.handover_devices.findUnique({
            where: { id },
            include: device
        });
    }

    async findHDById(id: number): Promise<> {
        const r = await this.findHandoverDeviceById(id);
        if (!r) throw new NotFoundException('Handover device request not found');
        return r;
    }

    async findAllHD(q: FindHandoverDeviceQueryDto): Promise<Paginated<>> {
        const { page = 1, limit = 20, isHandoverd = false } = q;
        const dateFilter = {
            ...(q.from !== undefined? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined? { lte: new Date(q.to) } : {}),
        };
        const where : Prisma.handover_devicesWhereInput = {
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
                include: device 
            }),
        ]);

        return {
            items: items.map(to),
            total, page, limit
        };
    }

    async updateHD({ id, data, actor }: UpdateHandoverDeviceMsg): Promise<> {
        let patch = {
            is_handovered
            handovered_at
            updated_at
        }
    }

    // === DISPOSE ===
    async disposeDevice({ dto, actor }: CreateDisposeDeviceMsg): Promise<> {
        chỉ có m và amới được tạo
        chỉ có chờ awaiting_disposal, available, broken
        const device = await this.devicesService.findById(deviceId);
        const d = await this.prisma.disposal_devices.create({
            data: {
                id: device.id,
                disposal_date: ,
                disposal_value: ,
                reason: ,
            },
        });
        const view = to
        this.events.disposed();
        return view;
    }

    findDisposeDeviceById(id: number): Promise<> {
        return this.prisma.disposal_devices.findUnique({
            where: { id },
            include: device
        });
    }

    async findDDById(id: number): Promise<> {
        const d = await this.findDisposeDeviceById(id);
        if (!d) throw new NotFoundException('Dispose device form not found');
        return d;
    }

    async findAllDD(q: FindDisposeDeviceQueryDto): Promise<Paginated<>> {
        const { page = 1, limit = 20 } = q;
        const priceFilter = {
            ...(q.above !== undefined
                ? { gte: new Prisma.Decimal(q.above) } : {}
            ),
            ...(q.below !== undefined
                ? { lte: new Prisma.Decimal(q.below) } : {}
            ),
        };
        const dateFilter = {
            ...(q.from !== undefined? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined? { lte: new Date(q.to) } : {}),
        };
        const where : Prisma.disposal_devicesWhereInput = {
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
                orderBy: { 
                    disposal_date: 'desc',
                    created_at: 'desc',
                },
                include: device 
            }),
        ]);

        return {
            items: items.map(to),
            total, page, limit
        };
    }

    // === DEVICE & EMPLOYEE ===
    async createDeviceEmployee({ dto, actor }: CreateDeviceEmployeeMsg): Promise<> {
        chỉ có available mới được tạo
        chỉ có m và a mới được tạo
        const device = await this.devicesService.findById(deviceId);
        const d = await this.prisma.device_employee.create({
            data: {
                device_id: device.id,
                employee_id: ,
                approver_id: ,
                assigned_at: ,
            },
        });
        const view = to
        this.events.disposed();
        return view;
    }

    findDeviceEmployeeById(id: number): Promise<> {
        return this.prisma.device_employee.findUnique({ 
            where: { id },
            include: { devices: { select: { code: true }}},
        });
    }

    async findDEById(id: number): Promise<> {
        const d = await this.findDeviceEmployeeById(id);
        if (!d) throw new NotFoundException('Device employee not found');
        return d;
    }

    async findAllDE(q: FindDeviceEmployeeQueryDto): Promise<Paginated<>> {
        const { page = 1, limit = 20, isReturned = false } = q;
        const dateFilter = {
            ...(q.from !== undefined? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined? { lte: new Date(q.to) } : {}),
        };
        const where : Prisma.device_employeeWhereInput = {
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
                include: { devices: { select: { code: true }}},
            }),
        ]);
        
        return {
            items: items.map(to),
            total, page, limit
        };
    }

    async updateDE({ id, data, actor }: UpdateDeviceEmployeeMsg): Promise<> {
        let patch = {
            is_returned: 
            returned_at:
            udpated_at: new Date()
        }
        chỉ có người tạo mới được cập nhật 
    }
}