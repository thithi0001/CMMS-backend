import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DEVICE_CMD, FindDeviceQueryDto } from "@app/shared";
import type {
    ConfirmDeviceImageMsg,
    CreateDeviceMsg,
    RemoveDeviceImageMsg,
    RequestDeviceImageUploadMsg,
    UpdateDeviceMsg,
} from '@app/shared';
import { DevicesService } from "./devices.service";

@Controller()
export class DevicesController {
    constructor(private readonly devices: DevicesService) {}

    @MessagePattern(DEVICE_CMD.CREATE)
    create(@Payload() msg: CreateDeviceMsg) {
        return this.devices.create(msg);
    }

    @MessagePattern(DEVICE_CMD.UPDATE)
    update(@Payload() msg: UpdateDeviceMsg) {
        return this.devices.update(msg);
    }

    @MessagePattern(DEVICE_CMD.FIND_ALL)
    findAll(@Payload() query: FindDeviceQueryDto) {
        return this.devices.findAll(query);
    }

    @MessagePattern(DEVICE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.devices.findById(id);
    }

    @MessagePattern(DEVICE_CMD.REQUEST_IMAGE_UPLOAD)
    requestImageUpload(@Payload() msg: RequestDeviceImageUploadMsg) {
        return this.devices.requestImageUpload(msg);
    }

    @MessagePattern(DEVICE_CMD.CONFIRM_IMAGE_UPLOAD)
    confirmImageUpload(@Payload() msg: ConfirmDeviceImageMsg) {
        return this.devices.confirmImageUpload(msg);
    }

    @MessagePattern(DEVICE_CMD.REMOVE_IMAGE)
    removeImage(@Payload() msg: RemoveDeviceImageMsg) {
        return this.devices.removeImage(msg);
    }
}