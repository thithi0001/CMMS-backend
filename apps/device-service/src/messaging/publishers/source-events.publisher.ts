import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DEVICE_SOURCE_EVT,
    DeviceSourceEventPayload,
    DeviceSourceView,
} from '@app/shared';

@Injectable()
export class DeviceSourceEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DeviceSourceEventsPublisher.name);

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

    created(s: DeviceSourceView, actorId: number) {
        this.publish<DeviceSourceEventPayload>(DEVICE_SOURCE_EVT.CREATED, {
            sourceId: s.id,
            sourceCode: s.code,
        }, actorId);
    }

    updated(s: DeviceSourceView, changedFields: string[], actorId: number) {
        this.publish<DeviceSourceEventPayload>(DEVICE_SOURCE_EVT.UPDATED, {
            sourceId: s.id,
            sourceCode: s.code,
            changedFields
        }, actorId);
    }

    deleted(s: DeviceSourceView, actorId: number) {
        this.publish<DeviceSourceEventPayload>(DEVICE_SOURCE_EVT.DELETED, {
            sourceId: s.id,
            sourceCode: s.code
        }, actorId);
    }
}