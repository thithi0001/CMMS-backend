import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated,
    UpdateTaskProposalMsg,
    FindTaskProposalMsg,
    CreateTaskProposalMsg,
    DeleteTaskProposalMsg,
    TaskProposalView,
    ProposalStatus,
    TaskStage,
} from '@app/shared';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toTaskProposalView } from '../views.mapper';
import { TasksService } from '../tasks/tasks.service';
import { TaskProposalEventsPublisher } from '../../messaging/publishers/task-proposal-events.publisher';

@Injectable()
export class TaskProposalsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TasksService,
        private readonly events: TaskProposalEventsPublisher,
    ) {}

    findTaskProposalById(id: number) {
        return this.prisma.task_proposals.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<TaskProposalView> {
        const d = await this.findTaskProposalById(id);
        if (!d) throw new NotFoundException('Task proposal not found');
        return toTaskProposalView(d);
    }

    async findAll({ q, actor }: FindTaskProposalMsg): Promise<Paginated<TaskProposalView>> {
        const { page = 1, limit = 20, status = ProposalStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.task_proposalsWhereInput = {
            status,
            ...(userId && { creator_id: userId }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.task_proposals.count({ where }),
            this.prisma.task_proposals.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
        ]);

        return {
            items: items.map(toTaskProposalView),
            total, page, limit
        }    
    }

    async create({ dto, actor }: CreateTaskProposalMsg): Promise<TaskProposalView> {
        if (actor.roleCode !== Role.TECHNICIAN)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasks.findById(dto.taskId);
        if (!(await this.tasks.isConfirmedAssignee(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.TODO)
            throw new ForbiddenException('Forbid to create task proposal');

        Kiểm tra kiểu chóa gì
        const d = await this.prisma.task_proposals.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                content: dto.content,
            },
        });
        const view = toTaskProposalView(d);
        this.events.created(view, actor.sub);
        return view;
    }

    // cho t sửa content
    // cho m xác nhận
    updateTaskProposal(id: number, data: Prisma.task_proposalsUpdateInput) { 
        return this.prisma.task_proposals.update({
            where: { id }, data,
        });
    }

    async update({ id, data, actor }: UpdateTaskProposalMsg): Promise<TaskProposalView> {
        const d = await this.findById(id);
        if (d.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this task proposal');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a task proposal');
        const task = await this.tasks.findById(d.taskId);

        let patch: Prisma.task_proposalsUpdateInput = {};
        if (actor.roleCode === Role.TECHNICIAN && actor.employeeId === d.creatorId) {
            patch = { content: data.content };
        } else if (actor.roleCode === Role.MANAGER && actor.employeeId === task.creatorId) {
            patch = {
                manager_review: data.managerReview,
                status: data.status,
                approved_at: new Date(),
            };
        } else throw new UnauthorizedException('Unauthorized to perform this action');
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return d;

        const updated = await this.updateTaskProposal(id, patch);
        const view = toTaskProposalView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }
    
    // xóa trước khi được xác nhận
    async delete({ id, actor }: DeleteTaskProposalMsg): Promise<TaskProposalView> {
        const d = await this.findById(id);
        if (d.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this task proposal');
        if (actor.roleCode !== Role.TECHNICIAN || actor.employeeId !== d.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.task_proposals.delete({ where: { id }});
        this.events.deleted(d, actor.sub);
        return d;
    }
}
