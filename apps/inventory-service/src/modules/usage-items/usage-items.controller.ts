import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USAGE_ITEM_LIST_CMD, FindUsageItemListQueryDto } from '@app/shared';
import type {
    CreateUsageItemListMsg,
    UpdateUsageItemListMsg,
    BlockUsageItemListMsg,
} from '@app/shared';
import { UsageItemsService } from './usage-items.service';

@Controller()
export class UsageItemsController {
    constructor(private readonly usageItems: UsageItemsService) {}

    @MessagePattern(USAGE_ITEM_LIST_CMD.CREATE)
    create(@Payload() msg: CreateUsageItemListMsg) {
        return this.usageItems.create(msg);
    }

    @MessagePattern(USAGE_ITEM_LIST_CMD.UPDATE)
    update(@Payload() msg: UpdateUsageItemListMsg) {
        return this.usageItems.updateList(msg);
    }

    @MessagePattern(USAGE_ITEM_LIST_CMD.BLOCK)
    block(@Payload() msg: BlockUsageItemListMsg) {
        return this.usageItems.block(msg);
    }

    @MessagePattern(USAGE_ITEM_LIST_CMD.FIND_ALL)
    findAll(@Payload() query: FindUsageItemListQueryDto) {
        return this.usageItems.findAll(query);
    }

    @MessagePattern(USAGE_ITEM_LIST_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.usageItems.findById(id);
    }
}
