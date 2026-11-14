import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated,
    AcceptanceView,
    FindAcceptanceMsg,
    CreateAcceptanceMsg,
    UpdateAcceptanceMsg,
    DeleteAcceptanceMsg,
    TaskStage,
    AcceptanceStatus, 
} from '@app/shared';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toAcceptanceView } from '../views.mapper';
import { TasksService } from '../tasks/tasks.service';
import { AcceptanceEventsPublisher } from '../../messaging/publishers/acceptance-events.publisher';

@Injectable()
export class AcceptancesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TasksService,
        private readonly events: AcceptanceEventsPublisher,
    ) {}

    findAcceptanceById(id: number) {
        return this.prisma.acceptance_reports.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<AcceptanceView> {
        const acceptance = await this.findAcceptanceById(id);
        if (!acceptance) throw new NotFoundException('Acceptance report not found');
        return toAcceptanceView(acceptance);
    }

    async findAll({ q, actor }: FindAcceptanceMsg): Promise<Paginated<AcceptanceView>> {
        const { page = 1, limit = 20, status = AcceptanceStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.acceptance_reportsWhereInput = {
            status,
            ...(userId && { creator_id: userId }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        }

        const [total, items] = await this.prisma.$transaction([
            this.prisma.acceptance_reports.count({ where }),
            this.prisma.acceptance_reports.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            })
        ]);

        return {
            items: items.map(toAcceptanceView),
            total, page, limit
        }
    }

    async create({ dto, actor }: CreateAcceptanceMsg): Promise<AcceptanceView> {
        const task = await this.tasks.findById(dto.taskId);
        if (task.stage !== TaskStage.IN_PROGRESS && task.stage !== TaskStage.DONE)
            throw new ForbiddenException('Forbid to create acceptance report');
        if (!(await this.tasks.isConfirmedAssignee(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');

        const acceptance = await this.prisma.acceptance_reports.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                content: dto.content,
            },
        });
        const view = toAcceptanceView(acceptance);
        this.events.created(view, actor.sub);
        return view;
    }

    // cho t update trước khi được duyệt
    // cho m duyệt, xong cập nhật task stage
    async update({ id, data, actor }: UpdateAcceptanceMsg): Promise<AcceptanceView> {
        const acceptance = await this.findById(id);
        if (acceptance.status !== AcceptanceStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this acceptance report');

        let patch = {};
        const task = await this.tasks.findById(acceptance.taskId);
        if (actor.roleCode === Role.MANAGER && actor.employeeId === task.creatorId) {

        } else if (actor.employeeId === acceptance.creatorId) {

        } else throw new UnauthorizedException('Unauthorized to perform this action');
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return acceptance;

        const updated = await this.prisma.acceptance_reports.update({
            where: { id },
            data: patch,
        });
        const view = toAcceptanceView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteAcceptanceMsg): Promise<AcceptanceView> {
        const acceptance = await this.findById(id);
        if (actor.employeeId !== acceptance.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (acceptance.status !== AcceptanceStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this acceptance report');

        await this.prisma.acceptance_reports.delete({ where: { id }});
        this.events.deleted(acceptance, actor.sub);
        return acceptance;
    }
}
