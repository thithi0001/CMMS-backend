import { Module } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
import { TicketsController } from "./tickets.controller";

@Module({
    controllers: [
        TasksController,
        TicketsController,
    ]
})
export class MaintenanceModule {}
