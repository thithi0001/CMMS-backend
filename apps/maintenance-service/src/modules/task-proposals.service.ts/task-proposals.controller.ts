import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { TASK_PROPOSAL_CMD } from "@app/shared";
import type {
    CreateTaskProposalMsg,
    DeleteTaskProposalMsg,
    FindTaskProposalMsg,
    UpdateTaskProposalMsg,
} from "@app/shared";
import { TaskProposalsService } from "./task-proposals.service";

@Controller()
export class TaskProposalsController {
    constructor(private readonly taskProposals: TaskProposalsService) {}

    @MessagePattern(TASK_PROPOSAL_CMD.CREATE)
    create(@Payload() msg: CreateTaskProposalMsg) {
        return this.taskProposals.create(msg);
    }

    @MessagePattern(TASK_PROPOSAL_CMD.UPDATE)
    update(@Payload() msg: UpdateTaskProposalMsg) {
        return this.taskProposals.update(msg);
    }

    @MessagePattern(TASK_PROPOSAL_CMD.DELETE)
    delete(@Payload() msg: DeleteTaskProposalMsg) {
        return this.taskProposals.delete(msg);
    }

    @MessagePattern(TASK_PROPOSAL_CMD.FIND_ALL)
    findAll(@Payload() msg: FindTaskProposalMsg) {
        return this.taskProposals.findAll(msg);
    }

    @MessagePattern(TASK_PROPOSAL_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.taskProposals.findById(id);
    }
}
