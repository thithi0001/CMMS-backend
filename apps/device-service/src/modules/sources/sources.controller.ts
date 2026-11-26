import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DEVICE_SOURCE_CMD } from '@app/shared';
import type { 
    CreateDeviceSourceMsg,
    UpdateDeviceSourceMsg,
    FindDeviceSourceQueryDto,
    DeleteDeviceSourceMsg,
} from '@app/shared';
import { DeviceSourcesService } from "./sources.service";

@Controller()
export class DeviceSourcesController {
    constructor(private readonly sources: DeviceSourcesService) {}

    @MessagePattern(DEVICE_SOURCE_CMD.CREATE)
    create(@Payload() msg: CreateDeviceSourceMsg) {
        return this.sources.create(msg);
    }

    @MessagePattern(DEVICE_SOURCE_CMD.UPDATE)
    update(@Payload() msg: UpdateDeviceSourceMsg) {
        return this.sources.update(msg);
    }

    @MessagePattern(DEVICE_SOURCE_CMD.DELETE)
    delete(@Payload() msg: DeleteDeviceSourceMsg) {
        return this.sources.delete(msg);
    }
    
    @MessagePattern(DEVICE_SOURCE_CMD.FIND_ALL)
    findAll(@Payload() query: FindDeviceSourceQueryDto) {
        return this.sources.findAll(query);
    }
    
    @MessagePattern(DEVICE_SOURCE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.sources.findById(id);
    }
    
}
