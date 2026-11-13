import {
    ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import {
    Paginated, Role,
    CreateAssignDeviceMsg, AssignDeviceView, FindAssignDeviceQueryDto, UpdateAssignDeviceMsg, DeleteAssignDeviceMsg,
    CreateRetrieveDeviceMsg, FindRetrieveDeviceQueryDto, UpdateRetrieveDeviceMsg, DeleteRetrieveDeviceMsg, RetrieveDeviceView,
    CreateHandoverDeviceMsg, FindHandoverDeviceQueryDto, UpdateHandoverDeviceMsg, HandoverDeviceView,
    CreateDisposeDeviceMsg, FindDisposeDeviceQueryDto, DisposeDeviceView,
    CreateDeviceEmployeeMsg, FindDeviceEmployeeQueryDto, UpdateDeviceEmployeeMsg,DeleteHandoverDeviceMsg, DeviceEmployeeView,
    DeviceState, RequestStatus,
} from '@app/shared';
import { DeviceEventsPublisher } from '../../messaging/publishers/device-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { toAssignDeviceView, toDeviceEmployeeView, toDisposeDeviceView, toHandoverDeviceView, toRetrieveDeviceView } from '../views.mapper';
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
                throw new UnauthorizedException('Unauthorized to perform this action');
            
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
            if (a.status !== RequestStatus.PENDING) 
                throw new ForbiddenException('Forbid to delete this assign device request')
        await this.prisma.assign_devices.delete({ where: { id }});

        this.events.assignDeviceDeleted(a, actor.sub);
        return a;
    }

    // === RETRIEVE ===
    async retrieve({ dto, actor }: CreateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
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
            include: { devices: { select: { code: true }}},
        });
        const view = toRetrieveDeviceView(retrieve);
        this.events.retrieveDeviceRequested(view, actor.sub);
        return view;
    }

    findRetrieveDeviceById(id: number) {
        return this.prisma.retrieve_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true }}},
        });
    }

    async findRDById(id: number): Promise<RetrieveDeviceView> {
        const r = await this.findRetrieveDeviceById(id);
        if (!r) throw new NotFoundException('Retrieve device request not found');
        return toRetrieveDeviceView(r);
    }

    async findAllRD(q: FindRetrieveDeviceQueryDto): Promise<Paginated<RetrieveDeviceView>> {
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
                include: { devices: { select: { code: true }}},
            }),
        ]);

        return {
            items: items.map(toRetrieveDeviceView),
            total, page, limit
        };
    }

    async updateRD({ id, data, actor }: UpdateRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const r = await this.findRDById(id);
        if (actor.employeeId !== r.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (r.isConfirmed)
            throw new ForbiddenException('Forbid to update retrieve device request');

        const patch = {
            is_confirmed: data.isConfirmed,
            required_time: data.requiredTime === undefined ? undefined : new Date(data.requiredTime),
            handover_id: data.handoverId === undefined ? undefined : data.handoverId,
            updated_at: new Date(),
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const updated = await this.prisma.retrieve_devices.update({
            where: { id: r.id },
            data: patch,
            include: { devices: { select: { code: true }}},
        });
        const view = toRetrieveDeviceView(updated);
        if (changedFields.length)
            this.events.retrieveDeviceUpdated(view, changedFields, actor.sub);
        return view;        
    }

    async deleteRD({ id, actor }: DeleteRetrieveDeviceMsg): Promise<RetrieveDeviceView> {
        const r = await this.findRDById(id);
        if (actor.employeeId !== r.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (r.isConfirmed)
            throw new ForbiddenException('Forbid to delete this retrieve device request');
        await this.prisma.retrieve_devices.delete({ where: { id }});
        this.events.retrieveDeviceDeleted(r, actor.sub);
        return r;
    }

    // === HANDOVER ===
    async handover({ dto, actor }: CreateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const device = await this.devicesService.findById(dto.deviceId);
        
        const h = await this.prisma.handover_devices.create({
            data: {
                device_id: device.id,
                creator_id: actor.employeeId,
                deliver_id: dto.deliverId,
                receiver_id: dto.receiverId,
                type: dto.type,
            },
            include: { devices: { select: { code: true }}},
        });
        const view = toHandoverDeviceView(h);
        this.events.handoverDeviceRequested(view, actor.sub);
        return view;
    }

    findHandoverDeviceById(id: number) {
        return this.prisma.handover_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true }}},
        });
    }

    async findHDById(id: number): Promise<HandoverDeviceView> {
        const r = await this.findHandoverDeviceById(id);
        if (!r) throw new NotFoundException('Handover device request not found');
        return toHandoverDeviceView(r);
    }

    async findAllHD(q: FindHandoverDeviceQueryDto): Promise<Paginated<HandoverDeviceView>> {
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
                include: { devices: { select: { code: true }}},
            }),
        ]);

        return {
            items: items.map(toHandoverDeviceView),
            total, page, limit
        };
    }

    async updateHD({ id, data, actor }: UpdateHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const h = await this.findHDById(id);
        if (h.isHandoverd)
            throw new ForbiddenException('Forbid to update handover device request');
        if (actor.employeeId !== h.receiverId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const patch = {
            is_handovered: true,
            handovered_at: data.handoveredAt !== undefined ? new Date(data.handoveredAt) : new Date(),
            updated_at: new Date(),
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        
        const updated = await this.prisma.handover_devices.update({
            where: { id },
            data: patch,
            include: { devices: { select: { code: true }}},
        });
        const view = toHandoverDeviceView(updated);
        if (changedFields.length)
            this.events.handoverDeviceUpdated(view, changedFields, actor.sub);
        return view;
    }

    async deleteHD({ id, actor }: DeleteHandoverDeviceMsg): Promise<HandoverDeviceView> {
        const h = await this.findHDById(id);
        if (h.isHandoverd)
            throw new ForbiddenException('Forbid to delete handover device request');
        if (actor.employeeId !== h.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        await this.prisma.$transaction([
            this.prisma.retrieve_devices.updateMany({
                where: { handover_id: h.id },
                data: { handover_id: null },
            }),
            this.prisma.handover_devices.delete({ where: { id }}),
        ]);
        this.events.handoverDeviceDeleted(h, actor.sub);
        return h;
    }

    // === DISPOSE ===
    async disposeDevice({ dto, actor }: CreateDisposeDeviceMsg): Promise<DisposeDeviceView> {
        if (actor.roleCode !== Role.ADMIN && actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const device = await this.devicesService.findById(dto.deviceId);
        const excluded: DeviceState[] = [
            DeviceState.AVAILABLE,
            DeviceState.BROKEN,
            DeviceState.AWAITING_DISPOSED,
        ];
        if (!excluded.includes(device.state))
            throw new ForbiddenException('Forbid to dispose this device');
        
        const [, d] = await this.prisma.$transaction([
            this.prisma.devices.update({
                where: { id: device.id },
                data: {
                    state: DeviceState.DISPOSED,
                    updated_at: new Date(),
                },
            }),
            this.prisma.disposal_devices.create({
                data: {
                    id: device.id,
                    creator_id: actor.employeeId,
                    disposal_date: new Date(dto.disposalDate),
                    disposal_value: Prisma.Decimal(dto.disposalValue),
                    reason: dto.reason,
                },
                include: { devices: { select: { code: true }}},
            }),
        ]);
        const view = toDisposeDeviceView(d);
        this.events.disposed(view, actor.sub);
        return view;
    }

    findDisposeDeviceById(id: number) {
        return this.prisma.disposal_devices.findUnique({
            where: { id },
            include: { devices: { select: { code: true }}},
        });
    }

    async findDDById(id: number): Promise<DisposeDeviceView> {
        const d = await this.findDisposeDeviceById(id);
        if (!d) throw new NotFoundException('Dispose device form not found');
        return toDisposeDeviceView(d);
    }

    async findAllDD(q: FindDisposeDeviceQueryDto): Promise<Paginated<DisposeDeviceView>> {
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
                include: { devices: { select: { code: true }}},
            }),
        ]);

        return {
            items: items.map(toDisposeDeviceView),
            total, page, limit
        };
    }

    // === DEVICE & EMPLOYEE ===
    async createDeviceEmployee({ dto, actor }: CreateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        if (actor.roleCode !== Role.ADMIN && actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const device = await this.devicesService.findById(dto.deviceId);
        if (device.state !== DeviceState.AVAILABLE)
            throw new ForbiddenException('Forbid to create device employee');
        
        const [d, ] = await this.prisma.$transaction([
            this.prisma.device_employee.create({
                data: {
                    device_id: device.id,
                    employee_id: dto.employeeId,
                    approver_id: actor.employeeId,
                    assigned_at: new Date(dto.assignedAt),
                },
                include: { devices: { select: { code: true }}},
            }),
            this.prisma.devices.update({
                where: { id: device.id },
                data: {
                    state: DeviceState.IN_USE,
                    updated_at: new Date(),
                }
            }),
        ]);
        const view = toDeviceEmployeeView(d);
        this.events.deviceEmployeeCreated(view, actor.sub);
        return view;
    }

    findDeviceEmployeeById(id: number) {
        return this.prisma.device_employee.findUnique({ 
            where: { id },
            include: { devices: { select: { code: true }}},
        });
    }

    async findDEById(id: number): Promise<DeviceEmployeeView> {
        const d = await this.findDeviceEmployeeById(id);
        if (!d) throw new NotFoundException('Device employee not found');
        return toDeviceEmployeeView(d);
    }

    async findAllDE(q: FindDeviceEmployeeQueryDto): Promise<Paginated<DeviceEmployeeView>> {
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
            items: items.map(toDeviceEmployeeView),
            total, page, limit
        };
    }

    async updateDE({ id, data, actor }: UpdateDeviceEmployeeMsg): Promise<DeviceEmployeeView> {
        const d = await this.findDEById(id);
        if (actor.employeeId !== d.approverId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const patch = {
            is_returned: true,
            returned_at: new Date(data.returnedAt),
            udpated_at: new Date(),
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        
        const [updated, ] = await this.prisma.$transaction([
            this.prisma.device_employee.update({
                where: { id },
                data: patch,
                include: { devices: { select: { code: true }}},
            }),
            this.prisma.devices.update({
                where: { id },
                data: {
                    state: DeviceState.AVAILABLE,
                    updated_at: new Date(),
                },
            }),
        ]);
        const view = toDeviceEmployeeView(updated);
        if (changedFields.length)
            this.events.deviceEmployeeUpdated(view, changedFields, actor.sub);
        return view;
    }
}