import { Module } from "@nestjs/common";
import { DeviceSourcesController } from "./sources.controller";
import { DeviceSourcesService } from "./sources.service";

@Module({
    controllers: [DeviceSourcesController],
    providers: [DeviceSourcesService],
    exports: [DeviceSourcesService],
}) export class DeviceSourcesModule {}