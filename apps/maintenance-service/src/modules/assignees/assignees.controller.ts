import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ASSIGNEE_CMD } from "@app/shared";
import type {
    CreateAssigneeMsg,
    DeleteAssigneeMsg,
    FindAssigneeMsg,
    UpdateAssigneeMsg,
} from "@app/shared";
import { AssigneesService } from "./assignees.service";

@Controller()
export class AssigneesController {
    constructor(private readonly assignees: AssigneesService) {}

    @MessagePattern(ASSIGNEE_CMD.CREATE)
    create(@Payload() msg: CreateAssigneeMsg) {
        return this.assignees.create(msg);
    }

    @MessagePattern(ASSIGNEE_CMD.UPDATE)
    update(@Payload() msg: UpdateAssigneeMsg) {
        return this.assignees.update(msg);
    }

    @MessagePattern(ASSIGNEE_CMD.DELETE)
    delete(@Payload() msg: DeleteAssigneeMsg) {
        return this.assignees.delete(msg);
    }

    @MessagePattern(ASSIGNEE_CMD.FIND_ALL)
    findAll(@Payload() msg: FindAssigneeMsg) {
        return this.assignees.findAll(msg);
    }

    @MessagePattern(ASSIGNEE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.assignees.findById(id);
    }
}
