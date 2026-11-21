import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, BATCH_EVT,
    BatchEventPayload,
    BatchView,
} from '@app/shared';

@Injectable()
export class BatchEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(BatchEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.INVENTORY, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(b: BatchView, actorId: number) {
        this.publish<BatchEventPayload>(BATCH_EVT.CREATED, {
            batchId: b.id,
            itemId: b.item.id,
            itemCode: b.item.code
        }, actorId);
    }

}