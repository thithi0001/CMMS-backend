import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BATCH_CMD } from '@app/shared';
import type { CreateBatchMsg, FindBatchMsg } from '@app/shared';
import { BatchesService } from './batches.service';

@Controller()
export class BatchesController {
    constructor(private readonly batches: BatchesService) {}

    @MessagePattern(BATCH_CMD.CREATE)
    create(@Payload() msg: CreateBatchMsg) {
        return this.batches.create(msg);
    }

    @MessagePattern(BATCH_CMD.FIND_ALL)
    findAll(@Payload() msg: FindBatchMsg) {
        return this.batches.findAll(msg);
    }

    @MessagePattern(BATCH_CMD.FIND_BY_ID)
    findById(@Payload() id: number) {
        return this.batches.findById(id);
    }
}
