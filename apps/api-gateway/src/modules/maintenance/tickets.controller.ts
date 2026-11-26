import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateTicketMsg, UpdateTicketMsg, DeleteTicketMsg,
    FindTicketMsg, TicketActionMsg,
    TicketView,
    JwtPayload, Paginated,
} from '@app/shared';
import {
    Role, TICKET_CMD,
    CreateTicketDto, UpdateTicketDto, FindTicketQueryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('tickets')
export class TicketsController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindTicketQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<TicketView>, FindTicketMsg>(
            TICKET_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.EMPLOYEE)
    @Post()
    create(
        @Body() dto: CreateTicketDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TicketView, CreateTicketMsg>(
            TICKET_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.EMPLOYEE)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTicketDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TicketView, UpdateTicketMsg>(
            TICKET_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER)
    @Patch(':id/confirm')
    confirm(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TicketView, TicketActionMsg>(
            TICKET_CMD.CONFIRM, {
                id, actor
            }
        );
    }
    
    @Roles(Role.EMPLOYEE)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<TicketView, DeleteTicketMsg>(
            TICKET_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    // @Get()
    // stats() {
    //     return this.bus.send<TicketView, >(
    //         TICKET_CMD., {
    //             , actor
    //         }
    //     );
    // }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<TicketView, number>(
            TICKET_CMD.FIND_BY_ID, id
        );
    }
}