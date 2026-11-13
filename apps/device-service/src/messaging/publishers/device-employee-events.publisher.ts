import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, DeviceEmployeePayload, DeviceEmployeeView,
    DEVICE_EMPLOYEE_EVT, SERVICES,
} from '@app/shared';

@Injectable()
export class DeviceEmployeeEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DeviceEmployeeEventsPublisher.name);

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

    created(employeeDevice: DeviceEmployeeView, actorId: number) {
        this.publish<DeviceEmployeePayload>(DEVICE_EMPLOYEE_EVT.CREATED, {
            id: employeeDevice.id,
            deviceId: employeeDevice.device.id,
            deviceCode: employeeDevice.device.code,
            employeeId: employeeDevice.employeeId,
            approverId: employeeDevice.approverId,
        }, actorId);
    }

    updated(
        employeeDevice: DeviceEmployeeView,
        changedFields: string[],
        actorId: number,
    ) {
        this.publish<DeviceEmployeePayload>(DEVICE_EMPLOYEE_EVT.UPDATED, {
            id: employeeDevice.id,
            deviceId: employeeDevice.device.id,
            deviceCode: employeeDevice.device.code,
            employeeId: employeeDevice.employeeId,
            approverId: employeeDevice.approverId,
            changedFields,
        }, actorId);
    }
}
