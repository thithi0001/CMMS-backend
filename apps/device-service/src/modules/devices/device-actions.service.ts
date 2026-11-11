import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateAssignDeviceMsg,
    AssignDeviceView,
    FindAssignDeviceQueryDto,
    Paginated,
    UpdateAssignDeviceMsg,
    DeleteAssignDeviceMsg,
    Role,
} from '@app/shared';
import { DeviceEventsPublisher } from '../../messaging/publishers/device-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { toAssignDeviceView } from '../views.mapper';
import { RequestStatus } from '@app/shared/types/device.enum';

@Injectable()
export class DeviceActionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly categoriesService: CategoriesService,
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
        const ad = await this.findAssignDeviceById(id);
        if (!ad) throw new NotFoundException('Assign device request not found');
        return toAssignDeviceView(ad);
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
        const ad = await this.findADById(id);
        if (ad.status !== RequestStatus.PENDING)
            throw new ForbiddenException('Forbid to update this assign device request');

        let patch = {};
        if (actor.roleCode === Role.MANAGER) {
            if (!data.status || data.status === RequestStatus.PENDING)
                throw new ForbiddenException('Forbid to update this assign device request');
            
            patch = {
                status: data.status,
                approver_id: actor.employeeId,
                approved_at: new Date(),
            };
        } else if (actor.employeeId === ad.creatorId) {
            patch = {
                reason: data.reason,
                require: data.require,
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
        const ad = await this.findADById(id);
        if (actor.employeeId !== ad.creatorId)
            if (ad.status !== RequestStatus.PENDING && ad.status !== RequestStatus.CANCEL) 
                throw new ForbiddenException('Forbid to delete this assign device request')
        await this.prisma.assign_devices.delete({ where: { id }});

        this.events.assignDeviceDeleted(ad, actor.sub);
        return ad;
    }

    // === RETRIEVE ===
    async retrieve(): Promise<> {

    }
    findRetrieveDeviceById(id: number)
    async findRDById(id: number)
    async findAllRD(q)
    async updateRD()
    async deleteRD() {
        nếu đã confirm thì không được delete
    }

    // === HANDOVER ===
    async handover(): Promise<> {

    }
    findHandoverDeviceById(id: number)
    async findHDById(id: number)
    async findAllHD(q)
    async updateHD()

    // === DISPOSE ===
    async disposeDevice(): Promise<> {

    }
    findDisposeDeviceById(id: number)
    async findDDById(id: number)
    async findAllDD(q)


    device-employee
}