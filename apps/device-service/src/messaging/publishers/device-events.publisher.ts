import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DEVICE_EVT,
    DeviceView, DeviceEventPayload, DeviceStateChangePayload,
    DeviceState,
} from '@app/shared';

@Injectable()
export class DeviceEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DeviceEventsPublisher.name);

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

    created(d: DeviceView, actorId: number) {
        this.publish<DeviceEventPayload>(DEVICE_EVT.CREATED, {
            deviceId: d.id,
            deviceCode: d.code
        }, actorId);
    }

    updated(d: DeviceView, changedFields: string[], actorId: number) {
        this.publish<DeviceEventPayload>(DEVICE_EVT.UPDATED, {
            deviceId: d.id,
            deviceCode: d.code,
            changedFields
        }, actorId);
    }

    stateChanged(d: DeviceView, oldState: DeviceState, actorId: number) {
        this.publish<DeviceStateChangePayload>(DEVICE_EVT.STATE_CHANGED, {
            deviceId: d.id,
            deviceCode: d.code,
            newState: d.state,
            oldState
        }, actorId);
    }
}