import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateTaskProposalMsg,
    DeleteTaskProposalMsg,
    FindTaskProposalMsg,
    JwtPayload, Paginated,
    TaskProposalView,
    UpdateTaskProposalMsg,
} from '@app/shared';
import {
    Role, TASK_PROPOSAL_CMD,
    CreateTaskProposalDto,
    UpdateTaskProposalDto,
    FindTaskProposalQueryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('task-proposals')
export class TaskProposalsController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindTaskProposalQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<TaskProposalView>, FindTaskProposalMsg>(
            TASK_PROPOSAL_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN, Role.EMPLOYEE)
    @Post()
    create(
        @Body() dto: CreateTaskProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskProposalView, CreateTaskProposalMsg>(
            TASK_PROPOSAL_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN, Role.EMPLOYEE)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTaskProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskProposalView, UpdateTaskProposalMsg>(
            TASK_PROPOSAL_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER)
    @Patch(':id/confirm')
    confirm(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTaskProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskProposalView, UpdateTaskProposalMsg>(
            TASK_PROPOSAL_CMD.CONFIRM, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN, Role.EMPLOYEE)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TaskProposalView, DeleteTaskProposalMsg>(
            TASK_PROPOSAL_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<TaskProposalView, number>(
            TASK_PROPOSAL_CMD.FIND_BY_ID, id
        );
    }
}