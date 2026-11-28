import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DEVICE_EMPLOYEE_CMD } from '@app/shared';
import type { 
    CreateDeviceEmployeeMsg,
    UpdateDeviceEmployeeMsg,
    FindDeviceEmployeeMsg,
} from '@app/shared';
import { DeviceEmployeeService } from "./device-employee.service";

@Controller()
export class DeviceEmployeeController {
    constructor(private readonly deviceEmployee: DeviceEmployeeService) {}

    @MessagePattern(DEVICE_EMPLOYEE_CMD.CREATE)
    create(@Payload() msg: CreateDeviceEmployeeMsg) {
        return this.deviceEmployee.create(msg);
    }

    @MessagePattern(DEVICE_EMPLOYEE_CMD.RETURN)
    return(@Payload() msg: UpdateDeviceEmployeeMsg) {
        return this.deviceEmployee.return(msg);
    }

    @MessagePattern(DEVICE_EMPLOYEE_CMD.FIND_ALL)
    findAll(@Payload() query: FindDeviceEmployeeMsg) {
        return this.deviceEmployee.findAll(query);
    }

    @MessagePattern(DEVICE_EMPLOYEE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.deviceEmployee.findById(id);
    }
}