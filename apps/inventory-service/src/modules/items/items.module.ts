import { Module } from "@nestjs/common";
import { ItemsService } from "./items.service";

@Module({
    imports: [],
    controllers: [],
    providers: [ItemsService],
    exports: [ItemsService],
}) export class ItemsModule {}