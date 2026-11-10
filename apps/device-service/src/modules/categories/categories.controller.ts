import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CATEGORY_CMD } from '@app/shared';
import type { 
    CreateCategoryMsg,
    DeleteCategoryMsg,
    FindCategoryQueryDto,
    UpdateCategoryMsg, 
} from '@app/shared';
import { CategoriesService } from "./categories.service";

@Controller()
export class CategoriesController {
    constructor(private readonly categories: CategoriesService) {}

    @MessagePattern(CATEGORY_CMD.CREATE)
    create(@Payload() msg: CreateCategoryMsg) {
        return this.categories.create(msg);
    }

    @MessagePattern(CATEGORY_CMD.UPDATE)
    update(@Payload() msg: UpdateCategoryMsg) {
        return this.categories.update(msg);
    }

    @MessagePattern(CATEGORY_CMD.DELETE)
    delete(@Payload() msg: DeleteCategoryMsg) {
        return this.categories.delete(msg);
    }

    @MessagePattern(CATEGORY_CMD.FIND_ALL)
    findAll(@Payload() query: FindCategoryQueryDto) {
        return this.categories.findAll(query);
    }

    @MessagePattern(CATEGORY_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.categories.findById(id);
    }
}
