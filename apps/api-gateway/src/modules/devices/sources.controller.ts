import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    SourceView,
    CreateSourceMsg,
    UpdateSourceMsg,
    JwtPayload, Paginated,
} from '@app/shared'
import { 
    SOURCE_CMD, Role, 
    FindSourceQueryDto,
    CreateSourceDto,
    UpdateSourceDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('sources')
export class SourcesController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Get()
    findAll(
        @Query() query: FindSourceQueryDto
    ) {
        return this.bus.send<Paginated<SourceView>, FindSourceQueryDto>(
            SOURCE_CMD.FIND_ALL, query
        );
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.bus.send<SourceView, number>(
            SOURCE_CMD.FIND_BY_ID, id
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateSourceDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<SourceView, CreateSourceMsg>(
            SOURCE_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.ADMIN, Role.MANAGER)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateSourceDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<SourceView, UpdateSourceMsg>(
            SOURCE_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
}