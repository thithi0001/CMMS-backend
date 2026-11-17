import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type { 
    Paginated, JwtPayload,
    AssigneeView,
    FindAssigneeMsg,
    CreateAssigneeMsg,
    DeleteAssigneeMsg,
} from '@app/shared';
import {
    Role, ASSIGNEE_CMD,
    FindAssigneeQueryDto,
    CreateAssigneeDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('assignees')
export class AssigneesController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindAssigneeQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<AssigneeView>, FindAssigneeMsg>(
            ASSIGNEE_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateAssigneeDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AssigneeView, CreateAssigneeMsg>(
            ASSIGNEE_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AssigneeView, DeleteAssigneeMsg>(
            ASSIGNEE_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<AssigneeView, number>(
            ASSIGNEE_CMD.FIND_BY_ID, id
        );
    }
}