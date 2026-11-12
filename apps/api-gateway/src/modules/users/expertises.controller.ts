import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    AssignExpertiseMsg,
    CreateExpertiseMsg,
    ExpertiseView,
    JwtPayload, Paginated,
    UserView,
} from '@app/shared'
import { 
    EXPERTISE_CMD, Role, 
    AssignExpertiseDto,
    CreateExpertiseDto,
    FindExpertiseQueryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('expertises')
export class ExpertisesController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Roles()
    @Get()
    findAll(
        @Query() query: FindExpertiseQueryDto
    ) {
        return this.bus.send<Paginated<ExpertiseView>, FindExpertiseQueryDto>(
            EXPERTISE_CMD.FIND_ALL, query
        );
    }

    @Roles()
    @Get('assigned/:userId')
    findByUserId(
        @Query() query: FindExpertiseQueryDto
    ) {
        return this.bus.send<Paginated<ExpertiseView>, FindExpertiseQueryDto>(
            EXPERTISE_CMD.FIND_BY_USER_ID, query
        );
    }

    @Roles()
    @Get(':id')
    findOne(
        @Param(':id', ParseIntPipe) id: number
    ) {
        return this.bus.send<ExpertiseView, number>(
            EXPERTISE_CMD.FIND_BY_ID, id
        );
    }

    @Roles(Role.ADMIN, Role.TECHNICIAN)
    @Post()
    create(
        @Body() dto: CreateExpertiseDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<ExpertiseView, CreateExpertiseMsg>(
            EXPERTISE_CMD.CREATE, {
                dto, actorId: actor.sub
            }
        );
    }

    @Roles(Role.TECHNICIAN)
    @Post('assign')
    assign(
        @Body() dto: AssignExpertiseDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<{
            user: UserView,
            expertise: ExpertiseView,
            assignedAt: string | undefined,
        }, AssignExpertiseMsg>(
            EXPERTISE_CMD.ASSIGN, {
                data: dto, actor
            }
        );
    }

    @Roles(Role.TECHNICIAN)
    @Delete()
    rovoke(
        @Body() dto: AssignExpertiseDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<{
            user: UserView,
            expertise: ExpertiseView,
            revokedAt: string | undefined,
        }, AssignExpertiseMsg>(
            EXPERTISE_CMD.REVOKE, {
                data: dto, actor
            }
        );
    }

}