import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
  CancelTaskMsg, ChangeTaskStageDto, ChangeTaskStageMsg, CreateTaskMsg,
  DeleteTaskMsg, FindTaskQueryDto, JwtPayload,
  Paginated, TaskActionMsg, TaskView, UpdateTaskMsg,
} from '@app/shared';
import {
  CreateTaskDto, Role, TASK_CMD, UpdateTaskDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('tasks')
export class TasksController {
    constructor(private readonly bus: BusService) { }

    @Roles()
    @Get()
    findAll(@Query() query: FindTaskQueryDto) {
        return this.bus.send<Paginated<TaskView>, FindTaskQueryDto>(
            TASK_CMD.FIND_ALL,
            query,
        );
    }

    @Roles(Role.MANAGER)
    @Post()
    create(@Body() dto: CreateTaskDto, @CurrentUser() actor: JwtPayload) {
        return this.bus.send<TaskView, CreateTaskMsg>(
            TASK_CMD.CREATE, {
            dto, actor,
        });
    }

    @Roles(Role.MANAGER)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTaskDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, UpdateTaskMsg>(
            TASK_CMD.UPDATE, {
            id, data: dto, actor,
        });
    }

    @Roles(Role.MANAGER)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, DeleteTaskMsg>(
            TASK_CMD.DELETE, {
            id, actor,
        });
    }

    @Roles(Role.TECHNICIAN)
    @Post(':id/start')
    start(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, TaskActionMsg>(
            TASK_CMD.START, {
            id, actor,
        });
    }

    @Roles(Role.TECHNICIAN)
    @Post(':id/end')
    end(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: JwtPayload) {
        return this.bus.send<TaskView, TaskActionMsg>(
            TASK_CMD.END, { id, actor });
    }

    @Roles(Role.MANAGER)
    @Post(':id/cancel')
    cancel(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, CancelTaskMsg>(
            TASK_CMD.CANCEL, {
            id, actor,
        });
    }

    @Roles(Role.MANAGER)
    @Post(':id/reopen')
    reopen(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, CancelTaskMsg>(
            TASK_CMD.REOPEN, {
            id,
            actor,
        });
    }

    @Roles(Role.MANAGER)
    @Post(':id/evaluate')
    evaluate(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ChangeTaskStageDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskView, ChangeTaskStageMsg>(
            TASK_CMD.EVALUATE, {
                id, data: dto, actor
        });
    }

    //   @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
    //   @Get('stats')
    //   stats() {
    //     return this.bus.send(TASK_CMD.STATS);
    //   }

    @Roles()
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.bus.send<TaskView, number>(
            TASK_CMD.FIND_BY_ID, id
        );
    }
}
