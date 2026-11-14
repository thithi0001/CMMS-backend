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
        const d = await this.findDisposeProposalById(id);
        if (!d) throw new NotFoundException('Dispose proposal not found');
        return toDisposeProposalView(d);
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
        if (actor.roleCode !== Role.TECHNICIAN)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasks.findById(dto.taskId);
        if (!(await this.tasks.isConfirmedAssignee(task.id, actor.employeeId)))
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.IN_PROGRESS)
            throw new ForbiddenException('Forbid to create dispose proposal');

        const d = await this.prisma.dispose_proposals.create({
            data: {
                creator_id: actor.employeeId,
                task_id: task.id,
                device_id: dto.deviceId,
                content: dto.content,
            },
        });
        const view = toDisposeProposalView(d);
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
        const d = await this.findById(id);
        if (d.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this dispose proposal');
        if (data.status === ProposalStatus.PENDING)
            throw new ConflictException('Cannot pending a dispose proposal');
        const task = await this.tasks.findById(d.taskId);

        let patch: Prisma.dispose_proposalsUpdateInput = {};
        if (actor.roleCode === Role.TECHNICIAN && actor.employeeId === d.creatorId) {
            patch = { content: data.content };
        } else if (actor.roleCode === Role.MANAGER && actor.employeeId === task.creatorId) {
            patch = {
                status: data.status,
                approved_at: new Date(),
            };
        } else throw new UnauthorizedException('Unauthorized to perform this action');
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return d;

        const updated = await this.updateDisposeProposal(id, patch);
        const view = toDisposeProposalView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }
    
    // xóa trước khi được xác nhận
    async delete({ id, actor }: DeleteDisposeProposalMsg): Promise<DisposeProposalView> {
        const d = await this.findById(id);
        if (d.status !== ProposalStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this dispose proposal');
        if (actor.roleCode !== Role.TECHNICIAN || actor.employeeId !== d.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.dispose_proposals.delete({ where: { id }});
        this.events.deleted(d, actor.sub);
        return d;
    }
}
