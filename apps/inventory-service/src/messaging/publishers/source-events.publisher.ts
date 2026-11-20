import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, INVENTORY_SOURCE_EVT,
    InventorySourceEventPayload,
    InventorySourceView,
} from '@app/shared';

@Injectable()
export class InventorySourceEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(InventorySourceEventsPublisher.name);

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

    created(s: InventorySourceView, actorId: number) {
        this.publish<InventorySourceEventPayload>(INVENTORY_SOURCE_EVT.CREATED, {
            sourceId: s.id,
            sourceCode: s.code
        }, actorId);
    }

    updated(s: InventorySourceView, changedFields: string[], actorId: number) {
        this.publish<InventorySourceEventPayload>(INVENTORY_SOURCE_EVT.UPDATED, {
            sourceId: s.id,
            sourceCode: s.code,
            changedFields
        }, actorId);
    }

    deleted(s: InventorySourceView, actorId: number) {
        this.publish<InventorySourceEventPayload>(INVENTORY_SOURCE_EVT.DELETED, {
            sourceId: s.id,
            sourceCode: s.code
        }, actorId);
    }

}