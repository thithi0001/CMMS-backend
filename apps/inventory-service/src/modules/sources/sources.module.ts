import { Module } from "@nestjs/common";
import { InventorySourcesService } from "./sources.service";

@Module({
    controllers: [],
    providers: [InventorySourcesService],
    exports: [InventorySourcesService],
}) export class InventorySourcesModule {}