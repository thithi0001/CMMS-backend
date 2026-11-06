import { Module } from "@nestjs/common";
import { ExpertisesController } from "./expertises.controller";
import { ExpertisesService } from "./expertises.service";
import { UsersModule } from "../users/users.module";

@Module({
    imports: [UsersModule],
    controllers: [ExpertisesController],
    providers: [ExpertisesService],
    exports: [ExpertisesService],
}) export class ExpertisesModule {}