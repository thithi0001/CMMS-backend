import {
    Body, Controller, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type { 
    Paginated, JwtPayload,
    DamageReportView,
    FindDamageReportMsg,
    CreateDamageReportMsg,
    UpdateDamageReportMsg,
    DeleteDamageReportMsg,
} from '@app/shared';
import {
    Role, DAMAGE_REPORT_CMD,
    FindDamageReportQueryDto,
    CreateDamageReportDto,
    UpdateDamageReportDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('damage-reports')
export class DamageReportsController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(
        @Query() query: FindDamageReportQueryDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<Paginated<DamageReportView>, FindDamageReportMsg>(
            DAMAGE_REPORT_CMD.FIND_ALL, {
                q: query, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Post()
    create(
        @Body() dto: CreateDamageReportDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DamageReportView, CreateDamageReportMsg>(
            DAMAGE_REPORT_CMD.CREATE, {
                dto, actor
            }
        );
    }
    
    @Roles(Role.TECHNICIAN)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDamageReportDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DamageReportView, UpdateDamageReportMsg>(
            DAMAGE_REPORT_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }
    
    @Roles(Role.MANAGER, Role.EMPLOYEE)
    @Patch(':id/confirm')
    confirm(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDamageReportDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DamageReportView, UpdateDamageReportMsg>(
            DAMAGE_REPORT_CMD.CONFIRM, {
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
        return this.bus.send<DamageReportView, DeleteDamageReportMsg>(
            DAMAGE_REPORT_CMD.DELETE, {
                id, actor
            }
        );
    }
    
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.bus.send<DamageReportView, number>(
            DAMAGE_REPORT_CMD.FIND_BY_ID, id
        );
    }
}