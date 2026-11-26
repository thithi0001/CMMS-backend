import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { DamageReportsController } from "./damage-reports.controller";
import { DamageReportsService } from "./damage-reports.service";

@Module({
    imports: [TasksModule],
    controllers: [DamageReportsController],
    providers: [DamageReportsService],
    exports: [DamageReportsService],
})
export class DamageReportsModule {}
