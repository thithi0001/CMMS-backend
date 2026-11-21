import { Module } from "@nestjs/common";
import { BatchesService } from "./batches.service";

@Module({
    controllers: [],
    providers: [BatchesService],
    exports: [BatchesService],
}) export class BatchesModule {}