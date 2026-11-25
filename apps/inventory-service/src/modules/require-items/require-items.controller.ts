import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { REQUIRE_ITEM_CMD, FindRequireItemQueryDto } from '@app/shared';
import type {
    CreateRequireItemMsg,
    UpdateRequireItemMsg,
    DeleteRequireItemMsg,
    RequireItemActionMsg,
} from '@app/shared';
import { RequireItemsService } from './require-items.service';

@Controller()
export class RequireItemsController {
    constructor(private readonly requireItems: RequireItemsService) {}

    @MessagePattern(REQUIRE_ITEM_CMD.CREATE)
    create(@Payload() msg: CreateRequireItemMsg) {
        return this.requireItems.create(msg);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.UPDATE)
    update(@Payload() msg: UpdateRequireItemMsg) {
        return this.requireItems.update(msg);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.DELETE)
    delete(@Payload() msg: DeleteRequireItemMsg) {
        return this.requireItems.delete(msg);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.FIND_ALL)
    findAll(@Payload() query: FindRequireItemQueryDto) {
        return this.requireItems.findAll(query);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.requireItems.findById(id);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.CONFIRM)
    confirm(@Payload() msg: RequireItemActionMsg) {
        return this.requireItems.confirm(msg);
    }

    @MessagePattern(REQUIRE_ITEM_CMD.FULFILL)
    fulfill(@Payload() msg: RequireItemActionMsg) {
        return this.requireItems.fulfill(msg);
    }
}
