import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    ASSIGN_DEVICE_EVT, AssignDevicePayload, AssignDeviceView,
    buildEvent, BUS_CLIENT, SERVICES,
} from '@app/shared';

@Injectable()
export class AssignDevicesEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(AssignDevicesEventsPublisher.name);

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

    created(assign: AssignDeviceView, actorId: number) {
        this.publish<AssignDevicePayload>(ASSIGN_DEVICE_EVT.CREATED, {
            assignDeviceId: assign.id,
            creatorId: assign.creatorId,
        }, actorId);
    }

    updated(assign: AssignDeviceView, changedFields: string[], actorId: number) {
        this.publish<AssignDevicePayload>(ASSIGN_DEVICE_EVT.UPDATED, {
            assignDeviceId: assign.id,
            creatorId: assign.creatorId,
            changedFields,
        }, actorId);
    }

    deleted(assign: AssignDeviceView, actorId: number) {
        this.publish<AssignDevicePayload>(ASSIGN_DEVICE_EVT.DELETED, {
            assignDeviceId: assign.id,
            creatorId: assign.creatorId,
        }, actorId);
    }
}
