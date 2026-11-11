import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, SOURCE_EVT,
    SourceEventPayload,
    SourceView,

} from '@app/shared';

@Injectable()
export class SourceEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(SourceEventsPublisher.name);

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

    created(s: SourceView, actorId: number) {
        this.publish<SourceEventPayload>(SOURCE_EVT.CREATED, {
            sourceId: s.id,
            sourceName: s.name,
            sourceType: s.type
        }, actorId);
    }

    updated(s: SourceView, actorId: number) {
        this.publish<SourceEventPayload>(SOURCE_EVT.UPDATED, {
            sourceId: s.id,
            sourceName: s.name,
            sourceType: s.type
        }, actorId);
    }

}