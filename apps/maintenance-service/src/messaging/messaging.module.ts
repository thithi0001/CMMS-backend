import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { TaskEventsPublisher } from './publishers/task-events.publisher';
import { AcceptanceEventsPublisher } from './publishers/acceptance-events.publisher';
import { AssigneeEventsPublisher } from './publishers/assignee-events.publisher';
import { DamageReportEventsPublisher } from './publishers/damage-report-events.publisher';
import { DisposeProposalEventsPublisher } from './publishers/dispose-proposal-events.publisher';
import { TaskProposalEventsPublisher } from './publishers/task-proposal-events.publisher';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([{
            name: BUS_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => 
                busClientOptions(config.getOrThrow<string>('RABBITMQ_URL')),
        }]),
    ],
    providers: [TaskEventsPublisher, AcceptanceEventsPublisher, AssigneeEventsPublisher, DamageReportEventsPublisher, DisposeProposalEventsPublisher, TaskProposalEventsPublisher],
    exports: [TaskEventsPublisher, AcceptanceEventsPublisher, AssigneeEventsPublisher, DamageReportEventsPublisher, DisposeProposalEventsPublisher, TaskProposalEventsPublisher],
}) export class MessagingModule {}