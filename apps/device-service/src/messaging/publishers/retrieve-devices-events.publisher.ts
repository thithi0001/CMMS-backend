import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, RetrieveDevicePayload, RetrieveDeviceView,
    RETRIEVE_DEVICE_EVT, SERVICES,
} from '@app/shared';

@Injectable()
export class RetrieveDevicesEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(RetrieveDevicesEventsPublisher.name);

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

    created(retrieve: RetrieveDeviceView, actorId: number) {
        this.publish<RetrieveDevicePayload>(RETRIEVE_DEVICE_EVT.CREATED, {
            retrieveDeviceId: retrieve.id,
            deviceCode: retrieve.device.code,
            creatorId: retrieve.creatorId,
        }, actorId);
    }

    updated(retrieve: RetrieveDeviceView, changedFields: string[], actorId: number) {
        this.publish<RetrieveDevicePayload>(RETRIEVE_DEVICE_EVT.UPDATED, {
            retrieveDeviceId: retrieve.id,
            deviceCode: retrieve.device.code,
            creatorId: retrieve.creatorId,
            changedFields,
        }, actorId);
    }

    deleted(retrieve: RetrieveDeviceView, actorId: number) {
        this.publish<RetrieveDevicePayload>(RETRIEVE_DEVICE_EVT.DELETED, {
            retrieveDeviceId: retrieve.id,
            deviceCode: retrieve.device.code,
            creatorId: retrieve.creatorId,
        }, actorId);
    }
}
