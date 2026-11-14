import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated, TaskView,
    CreateTaskMsg, UpdateTaskMsg, DeleteTaskMsg,
    ChangeTaskStageMsg, CancelTaskMsg, TaskActionMsg,
    FindTaskMsg,
    myParseDate,
    TaskStage, AssigneeStatus,
} from '@app/shared';
import { TaskEventsPublisher } from '../../messaging/publishers/task-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toTaskView } from '../views.mapper';

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: TaskEventsPublisher,
    ) {}

    findTaskById(id: number) {
        return this.prisma.tasks.findUnique({ where: { id }});
    }

    async create({ dto, actor }: CreateTaskMsg): Promise<TaskView> {
        if (actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        
        const start = myParseDate(dto.scheduledStartAt, 'scheduledStartAt');
        const end = myParseDate(dto.scheduledEndAt, 'scheduledEndAt');
        if (start && end && start.getTime() >= end.getTime())
            throw new ConflictException('End must be later than Start');

        const task = await this.prisma.tasks.create({
            data: {
                creator_id: actor.employeeId,
                title: dto.title,
                tag: dto.tag,
                content: dto.content,
                scheduled_start_at: start,
                scheduled_end_at: end,
            },
        });
        const view = toTaskView(task);
        this.events.created(view, actor.sub);
        return view;
    }
    
    async findById(id: number): Promise<TaskView> {
        const task = await this.findTaskById(id);
        if (!task)
            throw new NotFoundException('Task not found');
        return toTaskView(task);
    }

    // maintenance+device+user
    // nếu không phải ADMIN giới hạn lại trước bằng findByUserId(@CurrentUser)
    // ADMIN thì cho tìm toàn bộ
    async findAll({ q, actor}: FindTaskMsg ): Promise<Paginated<TaskView>> {
        const { page = 1, limit = 20 } = q;
        const dateFilter = {
            ...(q.from !== undefined ? { gte: new Date(q.from) } : {}),
            ...(q.to !== undefined ? { lte: new Date(q.to) } : {}),
        };
        const userId = actor.roleCode === Role.ADMIN ? q.userId : actor.employeeId;
        const where: Prisma.tasksWhereInput = {
            ...(userId && {
                OR: [
                    { creator_id: userId },
                    { assignees: { some: { assignee_id: userId }}},
                ],
            }),
            ...(q.search && { title: { contains: q.search, mode: 'insensitive' }}),
            ...(q.tag && { tag: q.tag }),
            ...(q.stage && { stage: q.stage }),
            ...(Object.keys(dateFilter).length > 0 ? { scheduled_start_at: dateFilter } : {}),
        };
        
        const [total, items] = await this.prisma.$transaction([
            this.prisma.tasks.count({ where }),
            this.prisma.tasks.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { scheduled_start_at: 'desc' },
            })
        ]);

        return {
            items: items.map(toTaskView),
            total, page, limit
        }
    }

    async isConfirmedAssignee(taskId: number, employeeId: number): Promise<boolean> {
        const assignees = await this.prisma.assignees.findMany({
            where: { task_id: taskId },
            select: {
                assignee_id: true,
                status: true,
            },
        });
        const isConfirmedAssignee = assignees.some(
            assignee =>
                assignee.assignee_id === employeeId &&
                assignee.status === AssigneeStatus.CONFIRMED,
        );

        return isConfirmedAssignee;
    }

    updateTask(id: number, data: Prisma.tasksUpdateInput) {
        return this.prisma.tasks.update({
            where: { id }, data,
        });
    }

    async update({ id, data, actor }: UpdateTaskMsg): Promise<TaskView> {
        const task = await this.findById(id);
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.TODO && task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Forbid to update this task');

        const start = myParseDate(
            data.scheduledStartAt === undefined ? task.scheduledStartAt : data.scheduledStartAt,
            'scheduledStartAt',
        );
        const end = myParseDate(
            data.scheduledEndAt === undefined ? task.scheduledEndAt : data.scheduledEndAt,
            'scheduledEndAt',
        );
        if (start && end && start.getTime() >= end.getTime())
            throw new ConflictException('End must be later than Start');
        
        const patch: Prisma.tasksUpdateInput = {
            title: data.title,
            tag: data.tag,
            content: data.content,
            scheduled_start_at: data.scheduledStartAt === undefined ? undefined : start,
            scheduled_end_at: data.scheduledEndAt === undefined ? undefined : end,
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return task;
        
        const updated = await this.updateTask(id, patch);
        const view = toTaskView(updated);
        this.events.updated(view, changedFields, actor.sub);
        return view;
    }
    
    async delete({ id, actor }: DeleteTaskMsg): Promise<TaskView> {
        const task = await this.findById(id);
        if (task.stage !== TaskStage.TODO && task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Forbid to delete this task');
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        await this.prisma.$transaction([
            // xóa quan hệ với ticket
            this.prisma.task_ticket.deleteMany({ where: { id }}),
            // xóa quan hệ với device
            this.prisma.task_device.deleteMany({ where: { id }}),
            // xóa task_proposal
            this.prisma.task_proposals.deleteMany({ where: { task_id: id }}),
            // xóa assignee
            this.prisma.assignees.deleteMany({ where: { task_id: id }}),
            // xóa task
            this.prisma.tasks.delete({ where: { id }}),
            // damage_report, dispose_proposal, acceptance_report chỉ được tạo khi task đã bắt đầu
            // task đang trong tiến trình không được xóa
        ]);
        this.events.deleted(task, actor.sub);
        return task;
    }

    private async changeStage(
        oldStage: TaskStage,
        { id, data, actor }: ChangeTaskStageMsg,
        actualTimes: { actual_start_at?: Date; actual_end_at?: Date } = {},
    ): Promise<TaskView> {
        const updated = await this.prisma.$transaction(async tx => {
            const result = await tx.tasks.updateMany({
                where: { id, stage: oldStage },
                data: { stage: data.newStage, ...actualTimes },
            });

            if (result.count === 0) {
                const current = await tx.tasks.findUnique({
                    where: { id },
                    select: { id: true },
                });
                if (!current)
                    throw new NotFoundException('Task not found');
                throw new ConflictException('Task stage changed; reload and retry');
            }

            return tx.tasks.findUniqueOrThrow({ where: { id } });
        });
        const view = toTaskView(updated);
        this.events.stageChanged(view, oldStage, actor.sub);
        return view;
    }

    async start({ id, actor }: TaskActionMsg): Promise<TaskView> {
        const task = await this.findById(id);
        const isConfirmedAssignee = await this.isConfirmedAssignee(task.id, actor.employeeId);
        if (!isConfirmedAssignee)
            throw new UnauthorizedException('Unauthorized to perform this action');

        if (task.stage !== TaskStage.TODO)
            throw new ForbiddenException('Can only start a TODO task');

        return this.changeStage(
            task.stage,
            { 
                id, 
                data: { newStage: TaskStage.IN_PROGRESS }, 
                actor 
            },
            { actual_start_at: new Date() },
        );
    }

    async end({ id, actor }: TaskActionMsg): Promise<TaskView> {
        const task = await this.findById(id);
        const isConfirmedAssignee = await this.isConfirmedAssignee(task.id, actor.employeeId);
        if (!isConfirmedAssignee)
            throw new UnauthorizedException('Unauthorized to perform this action');

        if (task.stage !== TaskStage.IN_PROGRESS)
            throw new ForbiddenException('Can only end an IN PROGRESS task');

        return this.changeStage(
            task.stage,
            { 
                id, 
                data: { newStage: TaskStage.DONE }, 
                actor 
            },
            { actual_end_at: new Date() },
        );
    }

    async cancel({ id, actor }: CancelTaskMsg): Promise<TaskView> {
        const task = await this.findById(id);
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.TODO)
            throw new ForbiddenException('Can only cancel a TODO task');

        return this.changeStage(
            task.stage, 
            { 
                id, 
                data: { newStage: TaskStage.CANCELLED }, 
                actor 
            }
        );
    }

    async reopen({ id, actor }: CancelTaskMsg): Promise<TaskView> {
        const task = await this.findById(id);
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Can only reopen a CANCELLED task');

        return this.changeStage(
            task.stage, 
            { 
                id, 
                data: { newStage: TaskStage.TODO }, 
                actor 
            }
        );
    }

    async evaluate({ id, data, actor}: ChangeTaskStageMsg): Promise<TaskView> {
        // đánh giá PASS hoặc FAIL
        const task = await this.findById(id);
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');
        if (task.stage !== TaskStage.DONE)
            throw new ForbiddenException('Can only evaluate a DONE task');
        if (data.newStage !== TaskStage.PASS && data.newStage !== TaskStage.FAIL)
            throw new ForbiddenException('A task can only be evaluated as PASS or FAIL.');

        return this.changeStage(task.stage, { id, data, actor });
    }

    async stats() {
        // thống kê task theo giai đoạn: TaskStage
        // admin thì được xem toàn bộ task
        // manager chỉ được xem task mình đã tạo
        // technician chỉ được xem task mình được phân công
    }
}
