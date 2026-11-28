import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { HANDOVER_DEVICE_CMD } from '@app/shared';
import type { 
    CreateHandoverDeviceMsg,
    DeleteHandoverDeviceMsg,
    FindHandoverDeviceMsg,
    UpdateHandoverDeviceMsg,
} from '@app/shared';
import { HandoverDevicesService } from "./handover-devices.service";

@Controller()
export class HandoverDevicesController {
    constructor(private readonly handoverDevices: HandoverDevicesService) {}
    
    @MessagePattern(HANDOVER_DEVICE_CMD.CREATE)
    create(@Payload() msg: CreateHandoverDeviceMsg) {
        return this.handoverDevices.create(msg);
    }

    @MessagePattern(HANDOVER_DEVICE_CMD.UPDATE)
    update(@Payload() msg: UpdateHandoverDeviceMsg) {
        return this.handoverDevices.update(msg);
    }

    @MessagePattern(HANDOVER_DEVICE_CMD.CONFIRM)
    confirm(@Payload() msg: UpdateHandoverDeviceMsg) {
        return this.handoverDevices.confirm(msg);
    }

    @MessagePattern(HANDOVER_DEVICE_CMD.DELETE)
    delete(@Payload() msg: DeleteHandoverDeviceMsg) {
        return this.handoverDevices.delete(msg);
    }

    @MessagePattern(HANDOVER_DEVICE_CMD.FIND_ALL)
    findAll(@Payload() query: FindHandoverDeviceMsg) {
        return this.handoverDevices.findAll(query);
    }

    @MessagePattern(HANDOVER_DEVICE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.handoverDevices.findById(id);
    }
}
