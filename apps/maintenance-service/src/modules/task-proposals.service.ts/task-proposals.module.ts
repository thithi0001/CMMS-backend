import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { TaskProposalsController } from "./task-proposals.controller";
import { TaskProposalsService } from "./task-proposals.service";

@Module({
    imports: [TasksModule],
    controllers: [TaskProposalsController],
    providers: [TaskProposalsService],
    exports: [TaskProposalsService],
})
export class TaskProposalsModule {}
