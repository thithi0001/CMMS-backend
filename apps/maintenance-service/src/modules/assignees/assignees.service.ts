import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated,
    AssigneeView,
    FindAssigneeMsg,
    DeleteAssigneeMsg,
    CreateAssigneeMsg,
    TaskStage,
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
        const { page = 1, limit = 20 } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.assigneesWhereInput = {
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
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const assignee = await this.prisma.assignees.create({
            data: {
                task_id: task.id,
                assignee_id: dto.assigneeId,
            },
        });
        const view = toAssigneeView(assignee);
        this.events.created(view, actor.sub);
        return view
    }

    async delete({ id, actor }: DeleteAssigneeMsg): Promise<AssigneeView> {
        const assignee = await this.findById(id);
        const task = await this.tasks.findById(assignee.taskId);
        if (task.stage !== TaskStage.TODO && task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Forbid to delete this assignee');
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.assignees.delete({ where: { id }});
        this.events.deleted(assignee, actor.sub);
        return assignee;
    }
}
