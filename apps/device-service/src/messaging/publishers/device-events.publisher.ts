import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DEVICE_EVT,
    DeviceView,
    DeviceEventPayload,
    DeviceUpdatePayload,
    DeviceStateChangePayload,
    AssignDeviceView,
    AssignDevicePayload,
} from '@app/shared';
import { DeviceState } from "@app/shared/types/device.enum";

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

    updated(id: number, code: string, changedFields: string[], actorId: number) {
        this.publish<DeviceEventPayload>(DEVICE_EVT.UPDATED, {
            deviceId: id,
            deviceCode: code,
            changedFields
        }, actorId);
    }
    
    stateChanged(id: number, code: string, oldState: DeviceState, newState: DeviceState, actorId: number) {
        this.publish<DeviceStateChangePayload>(DEVICE_EVT.STATE_CHANGED, {
            deviceId: id,
            deviceCode: code,
            oldState, newState
        }, actorId);
    }

    assignDeviceRequested(a: AssignDeviceView, actorId: number) {
        this.publish<AssignDevicePayload>(DEVICE_EVT.ASSIGN_DEVICE_CREATED, {
            assignDeviceId: a.id,
            creatorId: a.creatorId
        }, actorId);
    }
    assignDeviceUpdated(a: AssignDeviceView, changedFields: string[], actorId: number) {
        this.publish<AssignDevicePayload>(DEVICE_EVT.ASSIGN_DEVICE_UPDATED, {
            assignDeviceId: a.id,
            creatorId: a.creatorId,
            changedFields
        }, actorId);
    }
    assignDeviceDeleted(a: AssignDeviceView, actorId: number) {
        this.publish<AssignDevicePayload>(DEVICE_EVT.ASSIGN_DEVICE_DELETED, {
            assignDeviceId: a.id,
            creatorId: a.creatorId
        }, actorId);
    }

    retrieveDeviceRequested() {}
    retrieveDeviceUpdated() {}
    retrieveDeviceDeleted() {}

    handoverDeviceRequested() {}
    handoverDeviceUpdated() {}
    handoverDeviceDeleted() {}

    disposed() {}
}