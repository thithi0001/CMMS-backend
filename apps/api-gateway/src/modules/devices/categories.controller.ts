import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CategoryView,
    CreateCategoryMsg,
    UpdateCategoryMsg,
    DeleteCategoryMsg,
    JwtPayload, Paginated,
} from '@app/shared'
import { 
    CATEGORY_CMD, Role, 
    FindCategoryQueryDto,
    CreateCategoryDto,
    UpdateCategoryDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly bus: BusService
    ) {}

    @Get()
    findAll(
        @Query() query: FindCategoryQueryDto
    ) {
        return this.bus.send<Paginated<CategoryView>, FindCategoryQueryDto>(
            CATEGORY_CMD.FIND_ALL, query
        );
    }

    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number
    ) {
        return this.bus.send<CategoryView, number>(
            CATEGORY_CMD.FIND_BY_ID, id
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateCategoryDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<CategoryView, CreateCategoryMsg>(
            CATEGORY_CMD.CREATE, {
                dto, actor
            }
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCategoryDto,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<CategoryView, UpdateCategoryMsg>(
            CATEGORY_CMD.UPDATE, {
                id, data: dto, actor
            }
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Delete(':id')
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() actor: JwtPayload
    ) {
        return this.bus.send<CategoryView, DeleteCategoryMsg>(
            CATEGORY_CMD.DELETE, {
                id, actor
            }
        );
    }
}