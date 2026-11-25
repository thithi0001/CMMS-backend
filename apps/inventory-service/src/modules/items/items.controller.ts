import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ITEM_CMD, FindItemQueryDto } from '@app/shared';
import type { CreateItemMsg, UpdateItemMsg } from '@app/shared';
import { ItemsService } from './items.service';

@Controller()
export class ItemsController {
    constructor(private readonly items: ItemsService) {}

    @MessagePattern(ITEM_CMD.CREATE)
    create(@Payload() msg: CreateItemMsg) {
        return this.items.create(msg);
    }

    @MessagePattern(ITEM_CMD.UPDATE)
    update(@Payload() msg: UpdateItemMsg) {
        return this.items.update(msg);
    }

    @MessagePattern(ITEM_CMD.FIND_ALL)
    findAll(@Payload() query: FindItemQueryDto) {
        return this.items.findAll(query);
    }

    @MessagePattern(ITEM_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.items.findById(id);
    }
}
