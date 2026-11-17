import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateDisposeProposalMsg,
    DeleteDisposeProposalMsg,
    FindDisposeProposalMsg,
    JwtPayload, Paginated,
    DisposeProposalView,
    UpdateDisposeProposalMsg,
} from '@app/shared';
import {
    Role, DISPOSE_PROPOSAL_CMD,
    CreateDisposeProposalDto,
    UpdateDisposeProposalDto,
    FindDisposeProposalQueryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dispose-proposals')
export class DisposeProposalsController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindDisposeProposalQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<DisposeProposalView>, FindDisposeProposalMsg>(
            DISPOSE_PROPOSAL_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Post()
    create(
        @Body() dto: CreateDisposeProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DisposeProposalView, CreateDisposeProposalMsg>(
            DISPOSE_PROPOSAL_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDisposeProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DisposeProposalView, UpdateDisposeProposalMsg>(
            DISPOSE_PROPOSAL_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER)
    @Patch(':id/confirm')
    confirm(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDisposeProposalDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DisposeProposalView, UpdateDisposeProposalMsg>(
            DISPOSE_PROPOSAL_CMD.CONFIRM, {
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
        return this.bus.send<DisposeProposalView, DeleteDisposeProposalMsg>(
            DISPOSE_PROPOSAL_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<DisposeProposalView, number>(
            DISPOSE_PROPOSAL_CMD.FIND_BY_ID, id
        );
    }
}