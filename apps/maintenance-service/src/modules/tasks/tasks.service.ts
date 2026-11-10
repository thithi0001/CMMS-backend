import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateUserMsg, DeactivateUserMsg, UpdateRoleMsg, UpdateUserMsg,
    FindUserQueryDto, CreateUserDto,
    Paginated,
    UserStats, UserView,
    Role,
    CreateTaskDto,
} from '@app/shared';
import { TaskEventsPublisher } from '../../messaging/publishers/task-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toTaskView } from '../views.mapper';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: TaskEventsPublisher,
    ) {}

    // === Nội bộ ===
    findTaskById(id: number) {
        return this.prisma.tasks.findUnique({
            where: { id },
        });
    }

    findTaskByCreatorId(creatorId: number) {
        return this.prisma.tasks.findMany({
            where: { creator_id: creatorId },
            orderBy: { scheduled_start_at : 'asc' },
        });
    }

    async createTask(dto: CreateTaskDto): Promise<> {
        const task = await this.prisma.tasks.create({
            data: {
                creator_id: dto.creatorId,
                title: dto.title,
                tag: dto.tag,
                content: dto.content,
                scheduled_start_at: dto.scheduledStartAt,
                scheduled_end_at: dto.scheduledEndAt,
            },
        });

        return toTaskView(task);
    }
    

    // === RPC ===
    
    // giới hạn quyền
    findById
    // creator=maintenance+user:MANAGER, assignee=maintenance+user:TECHNICIAN, user=maintenance+(device)+user:EMPLOYEE
    // @CurrentUser
    findByUserId
    // maintenance+device+user
    // nếu không phải ADMIN giới hạn lại trước bằng findByUserId(@CurrentUser)
    // ADMIN thì cho tìm toàn bộ
    findAll
    create
    update
    delete
    start
    complete
    cancel



}
