import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, TICKET_EVT,
    TicketEventPayload,
    TicketView,
} from '@app/shared';

@Injectable()
export class TicketEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(TicketEventsPublisher.name);

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

    created(t: TicketView, actorId: number) {
        this.publish<TicketEventPayload>(TICKET_EVT.CREATED, {
            ticketId: t.id,
            creatorId: t.creatorId,
            deviceId: t.deviceId
        }, actorId);
    }

    updated(t: TicketView, changedFields: string[], actorId: number) {
        this.publish<TicketEventPayload>(TICKET_EVT.UPDATED, {
            ticketId: t.id,
            creatorId: t.creatorId,
            deviceId: t.deviceId,
            changedFields
        }, actorId);
    }
    
    confirmed(t: TicketView, actorId: number) {
        this.publish<TicketEventPayload>(TICKET_EVT.CONFIRMED, {
            ticketId: t.id,
            creatorId: t.creatorId,
            deviceId: t.deviceId,
            confirmerId: t.confirmerId
        }, actorId);
    }
    
    deleted(t: TicketView, actorId: number) {
        this.publish<TicketEventPayload>(TICKET_EVT.DELETED, {
            ticketId: t.id,
            creatorId: t.creatorId,
            deviceId: t.deviceId
        }, actorId);
    }
}