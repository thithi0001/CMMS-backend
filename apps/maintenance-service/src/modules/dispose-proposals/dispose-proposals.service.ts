import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated,
    UpdateDisposeProposalMsg,
    FindDisposeProposalMsg,
    CreateDisposeProposalMsg,
    DeleteDisposeProposalMsg,
    DisposeProposalView,
    ProposalStatus,
    TaskStage,
} from '@app/shared';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toDisposeProposalView } from '../views.mapper';
import { TasksService } from '../tasks/tasks.service';
import { DisposeProposalEventsPublisher } from '../../messaging/publishers/dispose-proposal-events.publisher';

@Injectable()
export class DisposeProposalsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TasksService,
        private readonly events: DisposeProposalEventsPublisher,
    ) {}

    findDisposeProposalById(id: number) {
        return this.prisma.dispose_proposals.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<DisposeProposalView> {
        const proposal = await this.findDisposeProposalById(id);
        if (!proposal) throw new NotFoundException('Dispose proposal not found');
        return toDisposeProposalView(proposal);
    }

    async findAll({ q, actor }: FindDisposeProposalMsg): Promise<Paginated<DisposeProposalView>> {
        const { page = 1, limit = 20, status = ProposalStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.dispose_proposalsWhereInput = {
            status,
            ...(userId && { creator_id: userId }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(q.deviceId && { device_id: q.deviceId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.dispose_proposals.count({ where }),
            this.prisma.dispose_proposals.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
        ]);

        return {
            items: items.map(toDisposeProposalView),
            total, page, limit
        }    
    }

    async create({ dto, actor }: CreateDisposeProposalMsg): Promise<DisposeProposalView> {
        // if (actor.roleCode !== Role.TECHNICIAN)
        //     throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasks.findById(dto.taskId);
        if (!(await this.tasks.isAssignedToTask(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.IN_PROGRESS)
            throw new ForbiddenException('Forbid to create dispose proposal');
        if (!task.deviceId)
            throw new ConflictException('Device is required');

        const proposal = await this.prisma.dispose_proposals.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                device_id: task.deviceId,
                content: dto.content,
            },
        });
        const view = toDisposeProposalView(proposal);
        this.events.created(view, actor.sub);
        return view;
    }

    // cho t sửa content
    // cho m xác nhận
    updateDisposeProposal(id: number, data: Prisma.dispose_proposalsUpdateInput) { 
        return this.prisma.dispose_proposals.update({
            where: { id }, data,
        });
    }

    async update({ id, data, actor }: UpdateDisposeProposalMsg): Promise<DisposeProposalView> {
        const proposal = await this.findById(id);
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this dispose proposal');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a dispose proposal');
        if (actor.employeeId !== proposal.creatorId) 
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const patch: Prisma.dispose_proposalsUpdateInput = { content: data.content };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return proposal;

        const updated = await this.updateDisposeProposal(id, patch);
        const view = toDisposeProposalView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async confirm({ id, data, actor }: UpdateDisposeProposalMsg): Promise<DisposeProposalView> {
        const proposal = await this.findById(id);
        if (actor.employeeId === proposal.creatorId)        
            throw new ForbiddenException('Cannot confirm your own proposal');
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this dispose proposal');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a dispose proposal');
        
        const task = await this.tasks.findById(proposal.taskId);
        if (actor.employeeId !== task.creatorId) 
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const patch: Prisma.dispose_proposalsUpdateInput = { status: data.status };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return proposal;

        const updated = await this.updateDisposeProposal(id, patch);
        const view = toDisposeProposalView(updated);
        this.events.confirmed(view, actor.sub);
        return view;
    }
    
    // xóa trước khi được xác nhận
    async delete({ id, actor }: DeleteDisposeProposalMsg): Promise<DisposeProposalView> {
        const proposal = await this.findById(id);
        if (proposal.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this dispose proposal');
        if (actor.employeeId !== proposal.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.dispose_proposals.delete({ where: { id }});
        this.events.deleted(proposal, actor.sub);
        return proposal;
    }
}
