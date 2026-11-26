import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, REQUIRE_ITEM_EVT,
    RequireItemEventPayload,
    RequireItemView,
} from '@app/shared';

@Injectable()
export class RequireItemEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(RequireItemEventsPublisher.name);

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

    created(r: RequireItemView, actorId: number) {
        this.publish<RequireItemEventPayload>(REQUIRE_ITEM_EVT.CREATED, {
            requireId: r.id,
            creatorId: r.creatorId
        }, actorId);
    }

    updated(r: RequireItemView, changedFields: string[], actorId: number) {
        this.publish<RequireItemEventPayload>(REQUIRE_ITEM_EVT.UPDATED, {
            requireId: r.id,
            creatorId: r.creatorId,
            changedFields
        }, actorId);
    }

    confirmed(r: RequireItemView, actorId: number) {
        this.publish<RequireItemEventPayload>(REQUIRE_ITEM_EVT.CONFIRMED, {
            requireId: r.id,
            creatorId: r.creatorId
        }, actorId);
    }

    fulfilled(r: RequireItemView, actorId: number) {
        this.publish<RequireItemEventPayload>(REQUIRE_ITEM_EVT.FULFILLED, {
            requireId: r.id,
            creatorId: r.creatorId
        }, actorId);
    }

    deleted(r: RequireItemView, actorId: number) {
        this.publish<RequireItemEventPayload>(REQUIRE_ITEM_EVT.DELETED, {
            requireId: r.id,
            creatorId: r.creatorId
        }, actorId);
    }

}