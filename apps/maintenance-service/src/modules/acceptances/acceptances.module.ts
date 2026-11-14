import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { AcceptancesController } from "./acceptances.controller";
import { AcceptancesService } from "./acceptances.service";

@Module({
    imports: [TasksModule],
    controllers: [AcceptancesController],
    providers: [AcceptancesService],
    exports: [AcceptancesService],
})
export class AcceptancesModule {}
