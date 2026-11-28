import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";

@Module({
    imports: [CategoriesModule],
    controllers: [DevicesController],
    providers: [DevicesService],
    exports: [DevicesService],
}) export class DevicesModule {}