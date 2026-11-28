import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RETRIEVE_DEVICE_CMD } from '@app/shared';
import type { 
    CreateRetrieveDeviceMsg,
    FindRetrieveDeviceMsg,
    UpdateRetrieveDeviceMsg,
    RetrieveDeviceActionMsg,
    DeleteRetrieveDeviceMsg,
} from '@app/shared';
import { RetrieveDevicesService } from "./retrieve-devices.service";

@Controller()
export class RetrieveDevicesController {
    constructor(private readonly retrieveDevices: RetrieveDevicesService) {}

    @MessagePattern(RETRIEVE_DEVICE_CMD.CREATE)
    create(@Payload() msg: CreateRetrieveDeviceMsg) {
        return this.retrieveDevices.create(msg);
    }

    @MessagePattern(RETRIEVE_DEVICE_CMD.UPDATE)
    update(@Payload() msg: UpdateRetrieveDeviceMsg) {
        return this.retrieveDevices.update(msg);
    }

    @MessagePattern(RETRIEVE_DEVICE_CMD.CONFIRM)
    confirm(@Payload() msg: RetrieveDeviceActionMsg) {
        return this.retrieveDevices.confirm(msg);
    }

    @MessagePattern(RETRIEVE_DEVICE_CMD.DELETE)
    delete(@Payload() msg: DeleteRetrieveDeviceMsg) {
        return this.retrieveDevices.delete(msg);
    }

    @MessagePattern(RETRIEVE_DEVICE_CMD.FIND_ALL)
    findAll(@Payload() msg: FindRetrieveDeviceMsg) {
        return this.retrieveDevices.findAll(msg);
    }

    @MessagePattern(RETRIEVE_DEVICE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.retrieveDevices.findById(id);
    }
}