import {
    Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    CreateItemMsg, UpdateItemMsg, ConfirmItemImageMsg,
    RemoveItemImageMsg, RequestItemImageUploadMsg,
    ItemImageUploadTicket,
    ItemView, ItemImageView,
    JwtPayload,
    Paginated,
} from '@app/shared';
import {
    CreateItemDto,
    FindItemQueryDto,
    ITEM_CMD,
    Role,
    RequestUploadDto,
    UpdateItemDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('items')
export class ItemsController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(@Query() query: FindItemQueryDto) {
        return this.bus.send<Paginated<ItemView>, FindItemQueryDto>(
            ITEM_CMD.FIND_ALL,
            query,
        );
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.bus.send<ItemView, number>(
            ITEM_CMD.FIND_BY_ID,
            id,
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateItemDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<ItemView, CreateItemMsg>(
            ITEM_CMD.CREATE,
            { dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateItemDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<ItemView, UpdateItemMsg>(
            ITEM_CMD.UPDATE,
            { id, data: dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post(':id/images/upload-url')
    requestImageUpload(
        @Param('id', ParseIntPipe) itemId: number,
        @Body() dto: RequestUploadDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<ItemImageUploadTicket, RequestItemImageUploadMsg>(
            ITEM_CMD.REQUEST_IMAGE_UPLOAD,
            { itemId, dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post(':id/images/:imageId/confirm')
    confirmImageUpload(
        @Param('id', ParseIntPipe) itemId: number,
        @Param('imageId', ParseIntPipe) imageId: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<ItemImageView, ConfirmItemImageMsg>(
            ITEM_CMD.CONFIRM_IMAGE_UPLOAD,
            { itemId, imageId, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Delete(':id/images/:imageId')
    removeImage(
        @Param('id', ParseIntPipe) itemId: number,
        @Param('imageId', ParseIntPipe) imageId: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<{ message: string }, RemoveItemImageMsg>(
            ITEM_CMD.REMOVE_IMAGE,
            { itemId, imageId, actor },
        );
    }
}
