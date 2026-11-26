import {
    Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    ConfirmDeviceImageMsg,
    CreateDeviceMsg,
    DeviceImageUploadTicket,
    DeviceImageView,
    DeviceView,
    JwtPayload,
    Paginated,
    RemoveDeviceImageMsg,
    RequestDeviceImageUploadMsg,
    UpdateDeviceMsg,
} from '@app/shared';
import {
    CreateDeviceDto,
    DEVICE_CMD,
    FindDeviceQueryDto,
    RequestUploadDto,
    Role,
    UpdateDeviceDto,
} from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('devices')
export class DevicesController {
    constructor(private readonly bus: BusService) {}

    @Get()
    findAll(@Query() query: FindDeviceQueryDto) {
        return this.bus.send<Paginated<DeviceView>, FindDeviceQueryDto>(
            DEVICE_CMD.FIND_ALL,
            query,
        );
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.bus.send<DeviceView, number>(
            DEVICE_CMD.FIND_BY_ID,
            id,
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post()
    create(
        @Body() dto: CreateDeviceDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DeviceView, CreateDeviceMsg>(
            DEVICE_CMD.CREATE,
            { dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateDeviceDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DeviceView, UpdateDeviceMsg>(
            DEVICE_CMD.UPDATE,
            { id, data: dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post(':id/images/upload-url')
    requestImageUpload(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: RequestUploadDto,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DeviceImageUploadTicket, RequestDeviceImageUploadMsg>(
            DEVICE_CMD.REQUEST_IMAGE_UPLOAD,
            { id, dto, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Post(':id/images/:imageId/confirm')
    confirmImageUpload(
        @Param('id', ParseIntPipe) id: number,
        @Param('imageId', ParseIntPipe) imageId: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<DeviceImageView, ConfirmDeviceImageMsg>(
            DEVICE_CMD.CONFIRM_IMAGE_UPLOAD,
            { id, imageId, actor },
        );
    }

    @Roles(Role.ADMIN, Role.MANAGER)
    @Delete(':id/images/:imageId')
    removeImage(
        @Param('id', ParseIntPipe) id: number,
        @Param('imageId', ParseIntPipe) imageId: number,
        @CurrentUser() actor: JwtPayload,
    ) {
        return this.bus.send<{ message: string }, RemoveDeviceImageMsg>(
            DEVICE_CMD.REMOVE_IMAGE,
            { id, imageId, actor },
        );
    }
}
