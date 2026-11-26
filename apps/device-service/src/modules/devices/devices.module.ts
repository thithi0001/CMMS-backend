import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";

@Module({
    controllers: [DevicesController],
    imports: [CategoriesModule],
    providers: [DevicesService],
    exports: [DevicesService],
}) export class DevicesModule {}