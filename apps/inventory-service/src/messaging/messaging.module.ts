import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { InventorySourceEventsPublisher } from './publishers/source-events.publisher';
import { ItemEventsPublisher } from './publishers/item-events.publisher';
import { BatchEventsPublisher } from './publishers/batch-events.publisher';
import { UsageItemEventsPublisher } from './publishers/usage-item-events.publisher';
import { RequireItemEventsPublisher } from './publishers/require-item-events.publisher';
import { MaintenanceTasksClient } from './clients/maintenance-tasks.client';

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
    providers: [
        InventorySourceEventsPublisher, 
        ItemEventsPublisher, 
        BatchEventsPublisher,
        RequireItemEventsPublisher, 
        UsageItemEventsPublisher,
        MaintenanceTasksClient,
    ],
    exports: [
        InventorySourceEventsPublisher, 
        ItemEventsPublisher, 
        BatchEventsPublisher, 
        RequireItemEventsPublisher,
        UsageItemEventsPublisher,
        MaintenanceTasksClient,
    ],
}) export class MessagingModule {}