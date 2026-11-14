import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { AcceptancesModule } from './modules/acceptances/acceptances.module';
import { AssigneesModule } from './modules/assignees/assignees.module';
import { DamageReportsModule } from './modules/damage-reports/damage-reports.module';
import { DisposeProposalsModule } from './modules/dispose-proposals/dispose-proposals.module';
import { TaskProposalsModule } from './modules/task-proposals.service.ts/task-proposals.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/maintenance-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        TasksModule,
        TicketsModule,
        AcceptancesModule,
        AssigneesModule,
        DamageReportsModule,
        DisposeProposalsModule,
        TaskProposalsModule,
    ],
}) export class AppModule {}