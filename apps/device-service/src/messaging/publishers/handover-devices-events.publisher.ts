import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, HandoverDevicePayload, HandoverDeviceView,
    HANDOVER_DEVICE_EVT, SERVICES,
} from '@app/shared';

@Injectable()
export class HandoverDevicesEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(HandoverDevicesEventsPublisher.name);

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

    created(handover: HandoverDeviceView, actorId: number) {
        this.publish<HandoverDevicePayload>(HANDOVER_DEVICE_EVT.CREATED, {
            handoverDeviceId: handover.id,
            deviceCode: handover.device.code,
            creatorId: handover.creatorId,
        }, actorId);
    }

    updated(handover: HandoverDeviceView, changedFields: string[], actorId: number) {
        this.publish<HandoverDevicePayload>(HANDOVER_DEVICE_EVT.UPDATED, {
            handoverDeviceId: handover.id,
            deviceCode: handover.device.code,
            creatorId: handover.creatorId,
            changedFields,
        }, actorId);
    }

    deleted(handover: HandoverDeviceView, actorId: number) {
        this.publish<HandoverDevicePayload>(HANDOVER_DEVICE_EVT.DELETED, {
            handoverDeviceId: handover.id,
            deviceCode: handover.device.code,
            creatorId: handover.creatorId,
        }, actorId);
    }
}
