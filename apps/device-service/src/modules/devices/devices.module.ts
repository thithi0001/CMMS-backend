import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { DeviceSourcesModule } from "../sources/sources.module";
import { DevicesService } from "./devices.service";

@Module({
    controllers: [],
    imports: [CategoriesModule, DeviceSourcesModule],
    providers: [DevicesService],
    exports: [DevicesService],
}) export class DevicesModule {}