import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    INVENTORY_SOURCE_CMD,
    FindInventorySourceQueryDto,
} from '@app/shared';
import type {
    CreateInventorySourceMsg,
    UpdateInventorySourceMsg,
    DeleteInventorySourceMsg,
} from '@app/shared';
import { InventorySourcesService } from './sources.service';

@Controller()
export class InventorySourcesController {
    constructor(private readonly sources: InventorySourcesService) {}

    @MessagePattern(INVENTORY_SOURCE_CMD.CREATE)
    create(@Payload() msg: CreateInventorySourceMsg) {
        return this.sources.create(msg);
    }

    @MessagePattern(INVENTORY_SOURCE_CMD.UPDATE)
    update(@Payload() msg: UpdateInventorySourceMsg) {
        return this.sources.update(msg);
    }

    @MessagePattern(INVENTORY_SOURCE_CMD.DELETE)
    delete(@Payload() msg: DeleteInventorySourceMsg) {
        return this.sources.delete(msg);
    }

    @MessagePattern(INVENTORY_SOURCE_CMD.FIND_ALL)
    findAll(@Payload() query: FindInventorySourceQueryDto) {
        return this.sources.findAll(query);
    }

    @MessagePattern(INVENTORY_SOURCE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.sources.findById(id);
    }
}
