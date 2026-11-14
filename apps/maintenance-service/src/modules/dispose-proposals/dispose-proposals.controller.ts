import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DISPOSE_PROPOSAL_CMD } from "@app/shared";
import type {
    CreateDisposeProposalMsg,
    DeleteDisposeProposalMsg,
    FindDisposeProposalMsg,
    UpdateDisposeProposalMsg,
} from "@app/shared";
import { DisposeProposalsService } from "./dispose-proposals.service";

@Controller()
export class DisposeProposalsController {
    constructor(private readonly disposeProposals: DisposeProposalsService) {}

    @MessagePattern(DISPOSE_PROPOSAL_CMD.CREATE)
    create(@Payload() msg: CreateDisposeProposalMsg) {
        return this.disposeProposals.create(msg);
    }

    @MessagePattern(DISPOSE_PROPOSAL_CMD.UPDATE)
    update(@Payload() msg: UpdateDisposeProposalMsg) {
        return this.disposeProposals.update(msg);
    }

    @MessagePattern(DISPOSE_PROPOSAL_CMD.DELETE)
    delete(@Payload() msg: DeleteDisposeProposalMsg) {
        return this.disposeProposals.delete(msg);
    }

    @MessagePattern(DISPOSE_PROPOSAL_CMD.FIND_ALL)
    findAll(@Payload() msg: FindDisposeProposalMsg) {
        return this.disposeProposals.findAll(msg);
    }

    @MessagePattern(DISPOSE_PROPOSAL_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.disposeProposals.findById(id);
    }
}
