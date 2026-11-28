import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DISPOSE_DEVICE_CMD } from '@app/shared';
import type {
    CreateDisposeDeviceMsg,
    FindDisposeDeviceMsg,
} from '@app/shared'
import { DisposeDevicesService } from "./dispose-devices.service";

@Controller()
export class DisposeDevicesController {
    constructor(private readonly disposeDevices: DisposeDevicesService) {}

    @MessagePattern(DISPOSE_DEVICE_CMD.DISPOSE)
    create(@Payload() msg: CreateDisposeDeviceMsg) {
        return this.disposeDevices.create(msg);
    }

    @MessagePattern(DISPOSE_DEVICE_CMD.FIND_ALL)
    findAll(@Payload() msg: FindDisposeDeviceMsg) {
        return this.disposeDevices.findAll(msg);
    }

    @MessagePattern(DISPOSE_DEVICE_CMD.FIND_BY_ID)
    findById(@Payload() deviceId: number) {
        return this.disposeDevices.findById(deviceId);
    }

}

