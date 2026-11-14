import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { DisposeProposalsController } from "./dispose-proposals.controller";
import { DisposeProposalsService } from "./dispose-proposals.service";

@Module({
    imports: [TasksModule],
    controllers: [DisposeProposalsController],
    providers: [DisposeProposalsService],
    exports: [DisposeProposalsService],
})
export class DisposeProposalsModule {}
