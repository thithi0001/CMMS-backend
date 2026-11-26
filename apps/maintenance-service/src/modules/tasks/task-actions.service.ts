import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { 
    Role, Paginated, TaskView,
    AttachToTaskMsg,
    TaskStage,
} from '@app/shared';
import { TaskEventsPublisher } from '../../messaging/publishers/task-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toTaskView } from '../views.mapper';
import { TasksService } from './tasks.service';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class TaskActionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tasksService: TasksService,
        private readonly ticketsService: TicketsService,
        private readonly events: TaskEventsPublisher,
    ) {}

    async attachTicket({ id, attachmentId, actor }: AttachToTaskMsg) {
        if (actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasksService.findById(id);
        if (task.stage !== TaskStage.TODO && task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Forbid to attach ticket to this task');
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        const ticket = await this.ticketsService.findById(attachmentId);
        // 1 task đã có ticket thì không được gắn thêm ticket
        // 1 ticket không được gắn cho 1 task có CONFIRMED, IN_PROGRESS, DONE, PASS, FAIL,
        // 1 ticket đã gắn cho 1 task đã PASS thì không được gắn cho task khác
        
        await this.prisma.$transaction(async tx => {
            const taskTicket = await tx.task_ticket.create({
                data: {
                    id: task.id,
                    ticket_id: ticket.id,
                },
                include: { tickets: { select: { device_id: true }}},
            });
            if (taskTicket) {
                const taskDevice = await tx.task_device.create({
                    data: {
                        id: task.id,
                        device_id: taskTicket.tickets.device_id,
                    },
                });
                if (!taskDevice)
                    throw new ConflictException('Cannot attach device to task');
            } else throw new ConflictException('Cannot attach ticket to task');
            this.events.ticketAttached(task, attachmentId, actor.sub);
        });
    }

    async attachDevice({ id, attachmentId, actor }: AttachToTaskMsg) {
        if (actor.roleCode !== Role.MANAGER)
            throw new UnauthorizedException('Unauthorized to perform this action');
        const task = await this.tasksService.findById(id);
        if (task.stage !== TaskStage.TODO && task.stage !== TaskStage.CANCELLED)
            throw new ForbiddenException('Forbid to attach ticket to this task');
        if (actor.employeeId !== task.creatorId)
            throw new UnauthorizedException('Unauthorized to perform this action');

        // 1 task đã có device thì không được gắn thêm device
        // 1 device không được gắn cho 1 task có CONFIRMED, IN_PROGRESS, DONE, PASS, FAIL,
        
        const taskDevice = await this.prisma.task_device.create({
            data: {
                id: task.id,
                device_id: attachmentId,
            },
        });
        if (!taskDevice)
            throw new ConflictException('Cannot attach device to task');
        this.events.deviceAttached(task, attachmentId, actor.sub);

    }
}