import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    JwtPayload, Paginated,
    DepartmentView,
    CreateDepartmentMsg,
} from '@app/shared'
import { 
    DEPARTMENT_CMD, Role,
    FindDepartmentQueryDto,
    CreateDepartmentDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('departments')
export class DepartmentsController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Get()
    findAll(
        @Query() query: FindDepartmentQueryDto
    ) {
        return this.bus.send<Paginated<DepartmentView>, FindDepartmentQueryDto>(
            DEPARTMENT_CMD.FIND_ALL, query
        );
    }

    @Roles(Role.ADMIN)
    @Post()
    create(
        @Body() dto: CreateDepartmentDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<DepartmentView, CreateDepartmentMsg>(
            DEPARTMENT_CMD.CREATE, {
                dto, actorId: actor.sub
            }
        );
    }
}