import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ASSIGN_DEVICE_CMD } from '@app/shared';
import type {
    CreateAssignDeviceMsg,
    FindAssignDeviceMsg,
    UpdateAssignDeviceMsg,
    DeleteAssignDeviceMsg,
} from '@app/shared';
import { AssignDevicesService } from "./assign-devices.service";

@Controller()
export class AssignDevicesController {
    constructor(private readonly assignDevices: AssignDevicesService) {}

    @MessagePattern(ASSIGN_DEVICE_CMD.CREATE)
    create(@Payload() msg: CreateAssignDeviceMsg) {
        return this.assignDevices.create(msg);
    }

    @MessagePattern(ASSIGN_DEVICE_CMD.UPDATE)
    update(@Payload() msg: UpdateAssignDeviceMsg) {
        return this.assignDevices.update(msg);
    }

    @MessagePattern(ASSIGN_DEVICE_CMD.CONFIRM)
    confirm(@Payload() msg: UpdateAssignDeviceMsg) {
        return this.assignDevices.update(msg);
    }

    @MessagePattern(ASSIGN_DEVICE_CMD.DELETE)
    delete(@Payload() msg: DeleteAssignDeviceMsg) {
        return this.assignDevices.delete(msg);
    }

    @MessagePattern(ASSIGN_DEVICE_CMD.FIND_ALL)
    findAll(@Payload() msg: FindAssignDeviceMsg) {
        return this.assignDevices.findAll(msg);
    }

    @MessagePattern(ASSIGN_DEVICE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.assignDevices.findById(id);
    }
}