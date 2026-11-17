import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated, myParseDate,
    DamageReportView,
    FindDamageReportMsg,
    CreateDamageReportMsg,
    UpdateDamageReportMsg,
    DeleteDamageReportMsg,
    ProposalStatus,
    TaskStage, 
} from '@app/shared';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDamageReportView } from '../views.mapper';
import { TasksService } from '../tasks/tasks.service';
import { DamageReportEventsPublisher } from '../../messaging/publishers/damage-report-events.publisher';

@Injectable()
export class DamageReportsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TasksService,
        private readonly events: DamageReportEventsPublisher,
    ) {}

    findDamageReportById(id: number) {
        return this.prisma.damage_reports.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<DamageReportView> {
        const report = await this.findDamageReportById(id);
        if (!report) throw new NotFoundException('Damage report not found');
        return toDamageReportView(report);   
    }

    async findAll({ q, actor }: FindDamageReportMsg): Promise<Paginated<DamageReportView>> {
        const { page = 1, limit = 20, status = ProposalStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.damage_reportsWhereInput = {
            status,
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { confirmer_id: userId },
                ],
            }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(q.deviceId && { device_id: q.deviceId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.damage_reports.count({ where }),
            this.prisma.damage_reports.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
        ]);

        return {
            items: items.map(toDamageReportView),
            total, page, limit
        }
    }

    async create({ dto, actor }: CreateDamageReportMsg): Promise<DamageReportView> {
        const task = await this.tasks.findById(dto.taskId);
        if (!(await this.tasks.isAssignedToTask(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (!task.deviceId)
            throw new ConflictException('Device is required');

        const report = await this.prisma.damage_reports.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                device_id: task.deviceId,
                content: dto.content,
            },
        });
        const view = toDamageReportView(report);
        this.events.created(view, actor.sub);
        return view;
    }
    
    updateDamageReport(id: number, data: Prisma.damage_reportsUpdateInput) { 
        return this.prisma.damage_reports.update({
            where: { id }, data, 
        });
    }
    
    async update({ id, data, actor }: UpdateDamageReportMsg): Promise<DamageReportView> {
        const report = await this.findById(id);
        if (actor.employeeId !== report.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const isPending = report.status === ProposalStatus.PENDING;
        const patch: Prisma.damage_reportsUpdateInput = {
            content: data.content,
            ...(!isPending && {
                status: data.status,
                confirmer_id: null,
                confirmed_at: null,
            }),
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return report;

        const updated = await this.updateDamageReport(id, patch);
        const view = toDamageReportView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    // cho e hoặc m xác nhận
    async confirm({ id, data, actor }: UpdateDamageReportMsg): Promise<DamageReportView> {
        const report = await this.findById(id);
        if (actor.employeeId === report.creatorId)        
            throw new ForbiddenException('Cannot confirm your own report');
        if (!report.status) return report;
        if (report.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to confirm this damage report');

        const patch: Prisma.damage_reportsUpdateInput = {
            status: data.status,
            confirmer_id: actor.employeeId,
            confirmed_at: new Date(),
        };
        const updated = await this.updateDamageReport(id, patch);
        const view = toDamageReportView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteDamageReportMsg): Promise<DamageReportView> {
        const report = await this.findById(id);
        if (report.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this damage report');
        if (actor.roleCode !== Role.TECHNICIAN || actor.employeeId !== report.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.damage_reports.delete({ where: { id }});
        this.events.deleted(report, actor.sub);
        return report;
    }
}
