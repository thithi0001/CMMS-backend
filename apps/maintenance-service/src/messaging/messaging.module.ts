import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { TaskEventsPublisher } from './publishers/task-events.publisher';
import { AcceptanceEventsPublisher } from './publishers/acceptance-events.publisher';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([{
            name: BUS_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => 
                busClientOptions(config.getOrThrow<string>('RABBITMQ_URL')),
        }])
    ],
    providers: [TaskEventsPublisher, AcceptanceEventsPublisher],
    exports: [TaskEventsPublisher, AcceptanceEventsPublisher],
}) export class MessagingModule {}