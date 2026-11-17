import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type { 
    Paginated, JwtPayload,
    AcceptanceView,
    FindAcceptanceMsg,
    CreateAcceptanceMsg,
    UpdateAcceptanceMsg,
    DeleteAcceptanceMsg,
} from '@app/shared';
import {
    Role, ACCEPTANCE_CMD,
    FindAcceptanceQueryDto,
    CreateAcceptanceDto,
    UpdateAcceptanceDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('acceptances')
export class AcceptancesController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindAcceptanceQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<AcceptanceView>, FindAcceptanceMsg>(
            ACCEPTANCE_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Post()
    create(
        @Body() dto: CreateAcceptanceDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AcceptanceView, CreateAcceptanceMsg>(
            ACCEPTANCE_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAcceptanceDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AcceptanceView, UpdateAcceptanceMsg>(
            ACCEPTANCE_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER, Role.EMPLOYEE)
    @Patch(':id/confirm')
    confirm(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAcceptanceDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AcceptanceView, UpdateAcceptanceMsg>(
            ACCEPTANCE_CMD.CONFIRM, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<AcceptanceView, DeleteAcceptanceMsg>(
            ACCEPTANCE_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<AcceptanceView, number>(
            ACCEPTANCE_CMD.FIND_BY_ID, id
        );
    }
}