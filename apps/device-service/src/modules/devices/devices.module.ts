import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { SourcesModule } from "../sources/sources.module";
import { DevicesService } from "./devices.service";

@Module({
    controllers: [],
    imports: [CategoriesModule, SourcesModule],
    providers: [DevicesService],
    exports: [DevicesService],
}) export class DevicesModule {}