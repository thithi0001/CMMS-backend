import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateUserDto, CreateUserMsg, DeactivateUserMsg,
    FindUserByIdMsg, FindUserQueryDto, 
    JwtPayload, Paginated, 
    UpdateRoleDto, UpdateRoleMsg, 
    UpdateUserDto, UpdateUserMsg,
    UserView,
} from '@app/shared';
import { USER_CMD, Role } from '@app/shared';
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

    @Roles(Role.ADMIN)
    @Patch(':id/role')
    updateRole(
        @Param(':id', ParseIntPipe) id: number,
        @Body() dto: UpdateRoleDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<UserView, UpdateRoleMsg>(
            USER_CMD.UPDATE_ROLE, {
                id,
                roleId: dto.roleId,
                actor,
            }
        )
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
}