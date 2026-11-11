import { Module } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { DeviceActionsService } from "./device-actions.service";

@Module({
    controllers: [],
    providers: [
        DevicesService,
        DeviceActionsService,
    ],
    exports: [
        DevicesService,
        DeviceActionsService,
    ],
}) export class DevicesModule {}