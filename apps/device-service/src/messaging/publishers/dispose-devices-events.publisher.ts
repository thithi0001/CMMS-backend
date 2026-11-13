import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, DisposeDevicePayload, DisposeDeviceView,
    DISPOSE_DEVICE_EVT, SERVICES,
} from '@app/shared';

@Injectable()
export class DisposeDevicesEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DisposeDevicesEventsPublisher.name);

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

    disposed(disposal: DisposeDeviceView, actorId: number) {
        this.publish<DisposeDevicePayload>(DISPOSE_DEVICE_EVT.DISPOSED, {
            deviceId: disposal.id,
            deviceCode: disposal.deviceCode,
            creatorId: disposal.creatorId,
        }, actorId);
    }
}
