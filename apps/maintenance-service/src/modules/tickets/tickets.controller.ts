import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { TICKET_CMD } from '@app/shared';
import type { 
    CreateTicketMsg,
    DeleteTicketMsg,
    FindTicketMsg,
    TicketActionMsg,
    UpdateTicketMsg,
} from '@app/shared';
import { TicketsService } from "./tickets.service";

@Controller()
export class TicketsController {
    constructor(private readonly tickets: TicketsService) {}

    @MessagePattern(TICKET_CMD.CREATE)
    create(@Payload() msg: CreateTicketMsg) {
        return this.tickets.create(msg);
    }

    @MessagePattern(TICKET_CMD.UPDATE)
    update(@Payload() msg: UpdateTicketMsg) {
        return this.tickets.update(msg);
    }
    
    @MessagePattern(TICKET_CMD.DELETE)
    delete(@Payload() msg: DeleteTicketMsg) {
        return this.tickets.delete(msg);
    }
    
    @MessagePattern(TICKET_CMD.CONFIRM)
    confirm(@Payload() msg: TicketActionMsg) {
        return this.tickets.confirm(msg);
    }
    
    @MessagePattern(TICKET_CMD.FIND_ALL)
    findAll(@Payload() msg: FindTicketMsg) {
        return this.tickets.findAll(msg);
    }
    
    @MessagePattern(TICKET_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.tickets.findById(id);
    }
    
    // @MessagePattern(TICKET_CMD.STATS)
    // stats(@Payload() msg: ) {
    //     return this.tickets.stats(msg);
    // }
    
}