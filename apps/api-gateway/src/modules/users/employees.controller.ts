import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateEmployeeMsg,
    EmployeeView,
    EndEmployeeMsg,
    JwtPayload, Paginated,
    UserView,
} from '@app/shared'
import { 
    EMPLOYEE_CMD, Role, 
    CreateEmployeeDto,
    EndEmployeeDto,
    FindEmployeeQueryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('employees')
export class EmployeesController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Get()
    findAll(
        @Query() query: FindEmployeeQueryDto
    ) {
        return this.bus.send<Paginated<{
            user: UserView,
            employee: EmployeeView,
        }>, FindEmployeeQueryDto>(
            EMPLOYEE_CMD.FIND_ALL, query
        );
    }
    
    @Get('current/:userId')
    findCurrentPosition(
        @Param('userId', ParseIntPipe) userId: number
    ) {
        return this.bus.send<{
            user: UserView,
            employee: EmployeeView,
        }, number>(
            EMPLOYEE_CMD.FIND_BY_USER_ID, userId
        );
    }
    
    @Roles(Role.ADMIN, Role.MANAGER)
    @Get('history')
    getHistory(
        @Query() query: FindEmployeeQueryDto
    ) {
        return this.bus.send<Paginated<EmployeeView>, FindEmployeeQueryDto>(
            EMPLOYEE_CMD.GET_HISTORY, query
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.bus.send<{
            user: UserView,
            employee: EmployeeView,
        }, number>(
            EMPLOYEE_CMD.FIND_BY_ID, id
        );
    }
    
    @Roles(Role.ADMIN)
    @Post()
    create(
        @Body() dto: CreateEmployeeDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<{
            user: UserView,
            employee: EmployeeView,
        }, CreateEmployeeMsg>(
            EMPLOYEE_CMD.CREATE, {
                dto, actorId: actor.sub
            }
        );
    }
    
    @Roles(Role.ADMIN)
    @Delete(':id')
    end(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: EndEmployeeDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<{
            user: UserView,
            employee: EmployeeView,
        }, EndEmployeeMsg>(
            EMPLOYEE_CMD.END, {
                id, data: dto, actor
            }
        );
    }
}