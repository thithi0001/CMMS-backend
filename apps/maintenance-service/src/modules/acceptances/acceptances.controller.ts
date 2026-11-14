import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { ACCEPTANCE_CMD } from "@app/shared";
import type {
    CreateAcceptanceMsg,
    DeleteAcceptanceMsg,
    FindAcceptanceMsg,
    UpdateAcceptanceMsg,
} from "@app/shared";
import { AcceptancesService } from "./acceptances.service";

@Controller()
export class AcceptancesController {
    constructor(private readonly acceptances: AcceptancesService) {}

    @MessagePattern(ACCEPTANCE_CMD.CREATE)
    create(@Payload() msg: CreateAcceptanceMsg) {
        return this.acceptances.create(msg);
    }

    @MessagePattern(ACCEPTANCE_CMD.UPDATE)
    update(@Payload() msg: UpdateAcceptanceMsg) {
        return this.acceptances.update(msg);
    }

    @MessagePattern(ACCEPTANCE_CMD.DELETE)
    delete(@Payload() msg: DeleteAcceptanceMsg) {
        return this.acceptances.delete(msg);
    }

    @MessagePattern(ACCEPTANCE_CMD.FIND_ALL)
    findAll(@Payload() msg: FindAcceptanceMsg) {
        return this.acceptances.findAll(msg);
    }

    @MessagePattern(ACCEPTANCE_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.acceptances.findById(id);
    }
}
