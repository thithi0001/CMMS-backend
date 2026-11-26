import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ITEM_CMD, FindItemQueryDto } from '@app/shared';
import type {
    ConfirmItemImageMsg,
    CreateItemMsg,
    RemoveItemImageMsg,
    RequestItemImageUploadMsg,
    UpdateItemMsg,
} from '@app/shared';
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

    @MessagePattern(ITEM_CMD.REQUEST_IMAGE_UPLOAD)
    requestImageUpload(@Payload() msg: RequestItemImageUploadMsg) {
        return this.items.requestImageUpload(msg);
    }

    @MessagePattern(ITEM_CMD.CONFIRM_IMAGE_UPLOAD)
    confirmImageUpload(@Payload() msg: ConfirmItemImageMsg) {
        return this.items.confirmImageUpload(msg);
    }

    @MessagePattern(ITEM_CMD.REMOVE_IMAGE)
    removeImage(@Payload() msg: RemoveItemImageMsg) {
        return this.items.removeImage(msg);
    }
}
