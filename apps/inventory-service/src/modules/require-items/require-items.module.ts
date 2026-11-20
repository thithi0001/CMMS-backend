import { Module } from "@nestjs/common";
import { RequireItemsService } from "./require-items.service";

@Module({
    controllers: [],
    providers: [RequireItemsService],
    exports: [RequireItemsService],
}) export class RequireItemsModule {}