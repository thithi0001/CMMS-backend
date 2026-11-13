import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DEVICE_EVT,
    DeviceView, DeviceEventPayload, DeviceStateChangePayload,
    AssignDeviceView, AssignDevicePayload,
    RetrieveDeviceView, RetrieveDevicePayload,
    HandoverDeviceView, HandoverDevicePayload,
    DisposeDeviceView, DisposeDevicePayload,
    DeviceEmployeeView, DeviceEmployeePayload,
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

    retrieveDeviceRequested(r: RetrieveDeviceView, actorId: number) {
        this.publish<RetrieveDevicePayload>(DEVICE_EVT.RETRIEVE_DEVICE_CREATED, {
            retrieveDeviceId: r.id,
            deviceCode: r.device.code,
            creatorId: r.creatorId
        }, actorId);
    }
    retrieveDeviceUpdated(r: RetrieveDeviceView, changedFields: string[], actorId: number) {
        this.publish<RetrieveDevicePayload>(DEVICE_EVT.RETRIEVE_DEVICE_UPDATED, {
            retrieveDeviceId: r.id,
            deviceCode: r.device.code,
            creatorId: r.creatorId,
            changedFields
        }, actorId);
    }
    retrieveDeviceDeleted(r: RetrieveDeviceView, actorId: number) {
        this.publish<RetrieveDevicePayload>(DEVICE_EVT.RETRIEVE_DEVICE_DELETED, {
            retrieveDeviceId: r.id,
            deviceCode: r.device.code,
            creatorId: r.creatorId
        }, actorId);
    }

    handoverDeviceRequested(h: HandoverDeviceView, actorId: number) {
        this.publish<HandoverDevicePayload>(DEVICE_EVT.HANDOVER_DEVICE_CREATED, {
            handoverDeviceId: h.id,
            deviceCode: h.device.code,
            creatorId: h.creatorId
        }, actorId);
    }
    handoverDeviceUpdated(h: HandoverDeviceView, changedFields: string[], actorId: number) {
        this.publish<HandoverDevicePayload>(DEVICE_EVT.HANDOVER_DEVICE_UPDATED, {
            handoverDeviceId: h.id,
            deviceCode: h.device.code,
            creatorId: h.creatorId,
            changedFields
        }, actorId);
    }
    handoverDeviceDeleted(h: HandoverDeviceView, actorId: number) {
        this.publish<HandoverDevicePayload>(DEVICE_EVT.HANDOVER_DEVICE_DELETED, {
            handoverDeviceId: h.id,
            deviceCode: h.device.code,
            creatorId: h.creatorId
        }, actorId);
    }

    disposed(d: DisposeDeviceView, actorId: number) {
        this.publish<DisposeDevicePayload>(DEVICE_EVT.DISPOSED, {
            deviceId: d.id,
            deviceCode: d.deviceCode,
            creatorId: d.creatorId
        }, actorId);
    }

    deviceEmployeeCreated(d: DeviceEmployeeView, actorId: number) {
        this.publish<DeviceEmployeePayload>(DEVICE_EVT.DEVICE_EMPLOYEE_CREATED, {
            id: d.id,
            deviceId: d.device.id,
            deviceCode: d.device.code,
            employeeId: d.employeeId,
            approverId: d.approverId
        }, actorId);
    }
    deviceEmployeeUpdated(d: DeviceEmployeeView, changedFields: string[], actorId: number) {
        this.publish<DeviceEmployeePayload>(DEVICE_EVT.DEVICE_EMPLOYEE_UPDATED, {
            id: d.id,
            deviceId: d.device.id,
            deviceCode: d.device.code,
            employeeId: d.employeeId,
            approverId: d.approverId,
            changedFields
        }, actorId);
    }
}