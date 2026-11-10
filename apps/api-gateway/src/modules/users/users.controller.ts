import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateUserMsg, DeactivateUserMsg,
    FindUserByIdMsg, 
    JwtPayload, Paginated, 
    UpdateRoleMsg, 
    UpdateUserMsg,
    UserView,
} from '@app/shared';
import { 
    USER_CMD, Role, 
    CreateUserDto, 
    FindUserQueryDto, 
    UpdateRoleDto, 
    UpdateUserDto, 
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Roles(Role.ADMIN, Role.MANAGER)
    @Get()
    findAll(
        @Query() query: FindUserQueryDto
    ) {
        return this.bus.send<Paginated<UserView>, FindUserQueryDto>(
            USER_CMD.FIND_ALL, query
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateUserDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<UserView, CreateUserMsg>(
            USER_CMD.CREATE, {
                dto, actorId: actor.sub
            }
        );
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.bus.send<UserView, FindUserByIdMsg>(
            USER_CMD.FIND_BY_ID, { id }
        );
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<UserView, UpdateUserMsg>(
            USER_CMD.UPDATE, {
                id,
                data: dto,
                actor
            }
        );
    }

    @Roles(Role.ADMIN)
    @Patch(':id/role')
    updateRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoleDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<UserView, UpdateRoleMsg>(
            USER_CMD.UPDATE_ROLE, {
                id,
                roleCode: dto.roleCode,
                actor
            }
        );
    }

    @Roles(Role.ADMIN)
    @Delete(':id')
    deactivate(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<UserView, DeactivateUserMsg>(
            USER_CMD.DEACTIVATE, {
                id, actor
            }
        );
    }

    // thiếu stats, forget-password
}