import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { AssigneesController } from "./assignees.controller";
import { AssigneesService } from "./assignees.service";

@Module({
    imports: [TasksModule],
    controllers: [AssigneesController],
    providers: [AssigneesService],
    exports: [AssigneesService],
})
export class AssigneesModule {}
