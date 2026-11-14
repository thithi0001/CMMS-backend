import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, ACCEPTANCE_EVT,
    AcceptanceView, AcceptanceEventPayload,
} from '@app/shared';

@Injectable()
export class AcceptanceEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(AcceptanceEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.MAINTENANCE, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(a: AcceptanceView, actorId: number) {
        this.publish<AcceptanceEventPayload>(ACCEPTANCE_EVT.CREATED, {
            acceptanceId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId
        }, actorId);
    }

    updated(a: AcceptanceView, changedFields: string[], actorId: number) {
        this.publish<AcceptanceEventPayload>(ACCEPTANCE_EVT.UPDATED, {
            acceptanceId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId,
            changedFields
        }, actorId);
    }
    
    deleted(a: AcceptanceView, actorId: number) {
        this.publish<AcceptanceEventPayload>(ACCEPTANCE_EVT.DELETED, {
            acceptanceId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId
        }, actorId);
    }
    
}