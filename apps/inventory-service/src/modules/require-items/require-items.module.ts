import { Module } from "@nestjs/common";
import { RequireItemsService } from "./require-items.service";
import { RequireItemsController } from "./require-items.controller";

@Module({
    controllers: [RequireItemsController],
    providers: [RequireItemsService],
    exports: [RequireItemsService],
}) export class RequireItemsModule {}