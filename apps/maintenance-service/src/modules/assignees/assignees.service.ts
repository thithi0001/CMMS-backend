import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated,
    AssigneeView,
    FindAssigneeMsg,
    DeleteAssigneeMsg,
    AssigneeStatus,
    UpdateAssigneeMsg,
    myParseDate,
    CreateAssigneeMsg, 
} from '@app/shared';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toAssigneeView } from '../views.mapper';
import { TasksService } from '../tasks/tasks.service';
import { AssigneeEventsPublisher } from '../../messaging/publishers/assignee-events.publisher';

@Injectable()
export class AssigneesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasks: TasksService,
        private readonly events: AssigneeEventsPublisher,
    ) {}

    findAssigneeById(id: number) {
        return this.prisma.assignees.findUnique({ where: { id }});
    }

    async findById(id: number): Promise<AssigneeView> {
        const assignee = await this.findAssigneeById(id);
        if (!assignee) throw new NotFoundException('Assignee not found');
        return toAssigneeView(assignee);
    }

    async findAll({ q, actor }: FindAssigneeMsg): Promise<Paginated<AssigneeView>> {
        const { page = 1, limit = 20, status = AssigneeStatus.PENDING } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.assigneesWhereInput = {
            status,
            ...(userId && { assignee_id: userId }),
            ...(q.taskId && { task_id: q.taskId }),
            ...(Object.keys(dateFilter).length > 0 ? { created_at: dateFilter } : {}),
        };

        const [total, items] = await this.prisma.$transaction([
            this.prisma.assignees.count({ where }),
            this.prisma.assignees.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
            })
        ]);

        return {
            items: items.map(toAssigneeView),
            total, page, limit
        }
    }

    async create({ dto, actor }: CreateAssigneeMsg): Promise<AssigneeView> {
        const task = await this.tasks.findById(dto.taskId);
        if (actor.roleCode !== Role.MANAGER || actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const assignee = await this.prisma.assignees.create({
            data: {
                task_id: task.id,
                assignee_id: dto.assigneeId,
                confirmation_deadline: myParseDate(dto.deadline, 'deadline'),
            },
        });
        const view = toAssigneeView(assignee);
        this.events.created(view, actor.sub);
        return view
    }

    // cho m chỉnh deadline
    // cho t xác nhận
    updateAssignee(id: number, data: Prisma.assigneesUpdateInput) {
        return this.prisma.assignees.update({ where: { id }, data });
    }
    
    async update({ id, data, actor }: UpdateAssigneeMsg): Promise<AssigneeView> {
        const assignee = await this.findById(id);
        if (assignee.status !== AssigneeStatus.PENDING)
            throw new ForbiddenException('Forbid to update this assignee');
        const task = await this.tasks.findById(assignee.taskId);

        let patch: Prisma.assigneesUpdateInput = {};
        if (actor.roleCode === Role.TECHNICIAN && actor.employeeId === assignee.assigneeId) {
            if (data.status === AssigneeStatus.PENDING)
                throw new ConflictException('Cannot pending an assignee form');
            // TECHNICIAN xác nhận có làm hay không
            patch = { status: data.status };
        } else if (actor.roleCode === Role.MANAGER && actor.employeeId === task.creatorId) {
            // MANAGER đổi deadline
            patch = { confirmation_deadline: myParseDate(data.deadline, 'deadline') };
        } else throw new UnauthorizedException('Unauthorized to perform this action');
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return assignee;

        const updated = await this.updateAssignee(id, patch);
        const view = toAssigneeView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }

    async delete({ id, actor }: DeleteAssigneeMsg): Promise<AssigneeView> {
        const assignee = await this.findById(id);
        if (assignee.status !== AssigneeStatus.PENDING)
            throw new ForbiddenException('Forbid to delete this assignee');
        const task = await this.tasks.findById(assignee.taskId);
        if (actor.roleCode !== Role.MANAGER || actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.assignees.delete({ where: { id }});
        this.events.deleted(assignee, actor.sub);
        return assignee;
    }
}
