import { Module } from "@nestjs/common";
import { InventorySourcesService } from "./sources.service";
import { InventorySourcesController } from "./sources.controller";

@Module({
    controllers: [InventorySourcesController],
    providers: [InventorySourcesService],
    exports: [InventorySourcesService],
}) export class InventorySourcesModule {}