import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, USAGE_ITEM_LIST_EVT,
    UsageItemListEventPayload,
    UsageItemView,
} from '@app/shared';

@Injectable()
export class UsageItemEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(UsageItemEventsPublisher.name);

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

    created(u: UsageItemView, actorId: number) {
        this.publish<UsageItemListEventPayload>(USAGE_ITEM_LIST_EVT.CREATED, {
            listId: u.id,
            creatorId: u.creatorId,
            totalItem: u.details.length
        }, actorId);
    }

    itemsUpdated(u: UsageItemView, updatedItems: number[], actorId: number) {
        this.publish<UsageItemListEventPayload>(USAGE_ITEM_LIST_EVT.UPDATED, {
            listId: u.id,
            creatorId: u.creatorId,
            totalItem: u.details.length,
            updatedItems
        }, actorId);
    }
    
    blocked(u: UsageItemView, actorId: number) {
        this.publish<UsageItemListEventPayload>(USAGE_ITEM_LIST_EVT.BLOCKED, {
            listId: u.id,
            creatorId: u.creatorId,
            totalItem: u.details.length
        }, actorId);
    }
}