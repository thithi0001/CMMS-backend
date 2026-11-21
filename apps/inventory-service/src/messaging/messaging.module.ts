import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { InventorySourceEventsPublisher } from './publishers/source-events.publisher';
import { ItemEventsPublisher } from './publishers/item-events.publisher';
import { BatchEventsPublisher } from './publishers/batch-events.publisher';

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
    providers: [InventorySourceEventsPublisher, ItemEventsPublisher, BatchEventsPublisher],
    exports: [InventorySourceEventsPublisher, ItemEventsPublisher, BatchEventsPublisher],
}) export class MessagingModule {}