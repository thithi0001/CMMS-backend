import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DEVICE_SOURCE_CMD } from '@app/shared';
import type { 
    CreateSourceMsg,
    UpdateSourceMsg,
    FindDeviceSourceQueryDto,
} from '@app/shared';
import { DeviceSourcesService } from "./sources.service";

@Controller()
export class DeviceSourcesController {
    constructor(private readonly sources: DeviceSourcesService) {}

    @MessagePattern(DEVICE_SOURCE_CMD.CREATE)
    create(@Payload() msg: CreateSourceMsg) {
        return this.sources.create(msg);
    }

    @MessagePattern(DEVICE_SOURCE_CMD.UPDATE)
    update(@Payload() msg: UpdateSourceMsg) {
        return this.sources.udpate(msg);
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
