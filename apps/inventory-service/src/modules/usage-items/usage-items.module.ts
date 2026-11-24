import { Module } from "@nestjs/common";
import { UsageItemsService } from "./usage-items.service";
import { UsageItemsController } from "./usage-items.controller";

@Module({
    controllers: [UsageItemsController],
    providers: [UsageItemsService],
    exports: [UsageItemsService],
}) export class UsageItemsModule {}