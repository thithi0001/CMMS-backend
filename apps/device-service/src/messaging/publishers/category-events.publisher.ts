import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, CATEGORY_EVT,
    CategoryView,
    CategoryEventPayload,
    CategoryUpdatePayload, 
} from '@app/shared';

@Injectable()
export class CategoryEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(CategoryEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.DEVICE, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(c: CategoryView, actorId: number) {
        this.publish<CategoryEventPayload>(CATEGORY_EVT.CREATED, {
            categoryId: c.id,
            categoryName: c.name,
            categoryCode: c.code
        }, actorId);
    }

    updated(id: number, changedFields: string[], actorId: number) {
        this.publish<CategoryUpdatePayload>(CATEGORY_EVT.UPDATED, {
            categoryId: id,
            changedFields
        }, actorId);
    }

    deleted(c: CategoryView, actorId: number) {
        this.publish<CategoryEventPayload>(CATEGORY_EVT.DELETED, {
            categoryId: c.id,
            categoryName: c.name,
            categoryCode: c.code
        }, actorId);
    }

}