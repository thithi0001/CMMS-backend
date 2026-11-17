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
        const proposal = await this.findTaskProposalById(id);
        if (!proposal) throw new NotFoundException('Task proposal not found');
        return toTaskProposalView(proposal);
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
        // if (actor.roleCode !== Role.TECHNICIAN)
        //     throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasks.findById(dto.taskId);
        if (!(await this.tasks.isAssignedToTask(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');
        // kiểm tra thêm xem có phải là nhân viên liên quan đến thiết bị
        if (task.stage !== TaskStage.TODO)
            throw new ForbiddenException('Forbid to create task proposal');

        const proposal = await this.prisma.task_proposals.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                content: dto.content,
            },
        });
        const view = toTaskProposalView(proposal);
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
        const proposal = await this.findById(id);
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to perform this action');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a task proposal');
        if (actor.employeeId !== proposal.creatorId) 
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const patch: Prisma.task_proposalsUpdateInput = { content: data.content };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return proposal;

        const updated = await this.updateTaskProposal(id, patch);
        const view = toTaskProposalView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async confirm({ id, data, actor }: UpdateTaskProposalMsg): Promise<TaskProposalView> {
        const proposal = await this.findById(id);
        if (actor.employeeId === proposal.creatorId)        
            throw new ForbiddenException('Cannot confirm your own proposal');
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to perform this action');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a task proposal');
        
        const task = await this.tasks.findById(proposal.taskId);
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const patch: Prisma.task_proposalsUpdateInput = { 
            manager_review: data.managerReview,
            status: data.status,
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return proposal;

        const updated = await this.updateTaskProposal(id, patch);
        const view = toTaskProposalView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
    }
    
    // xóa trước khi được xác nhận
    async delete({ id, actor }: DeleteTaskProposalMsg): Promise<TaskProposalView> {
        const proposal = await this.findById(id);
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this task proposal');
        // kiểm tra thêm xem có phải là nhân viên liên quan đến thiết bị
        if (actor.employeeId !== proposal.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.task_proposals.delete({ where: { id }});
        this.events.deleted(proposal, actor.sub);
        return proposal;
    }
}
