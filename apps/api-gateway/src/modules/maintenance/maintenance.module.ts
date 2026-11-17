import { Module } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
import { TicketsController } from "./tickets.controller";
import { TaskProposalsController } from "./task-proposals.controller";
import { DisposeProposalsController } from "./dispose-proposals.controller";
import { DamageReportsController } from "./damage-reports.controller";
import { AssigneesController } from "./assignees.controller";
import { AcceptancesController } from "./acceptances.controller";

@Module({
    controllers: [
        TasksController,
        TicketsController,
        TaskProposalsController,
        DisposeProposalsController,
        DamageReportsController,
        AssigneesController,
        AcceptancesController,
    ]
})
export class MaintenanceModule {}
