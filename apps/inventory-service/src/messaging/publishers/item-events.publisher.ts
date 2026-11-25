import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, ITEM_EVT,
    ItemEventPayload,
    ItemView,
} from '@app/shared';

@Injectable()
export class ItemEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(ItemEventsPublisher.name);

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

    created(i: ItemView, actorId: number) {
        this.publish<ItemEventPayload>(ITEM_EVT.CREATED, {
            itemId: i.id,
            itemCode: i.code
        }, actorId);
    }
    
    updated(i: ItemView, changedFields: string[], actorId: number) {
        this.publish<ItemEventPayload>(ITEM_EVT.UPDATED, {
            itemId: i.id,
            itemCode: i.code,
            changedFields            
        }, actorId);
    }

}