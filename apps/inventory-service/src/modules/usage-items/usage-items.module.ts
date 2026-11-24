import { Module } from "@nestjs/common";
import { UsageItemsService } from "./usage-items.service";

@Module({
    controllers: [],
    providers: [UsageItemsService],
    exports: [UsageItemsService],
}) export class UsageItemsModule {}