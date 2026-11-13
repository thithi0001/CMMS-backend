import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { CategoryEventsPublisher } from './publishers/category-events.publisher';
import { SourceEventsPublisher } from './publishers/source-events.publisher';
import { DeviceEventsPublisher } from './publishers/device-events.publisher';
import { AssignDevicesEventsPublisher } from './publishers/assign-devices-events.publisher';
import { RetrieveDevicesEventsPublisher } from './publishers/retrieve-devices-events.publisher';
import { HandoverDevicesEventsPublisher } from './publishers/handover-devices-events.publisher';
import { DisposeDevicesEventsPublisher } from './publishers/dispose-devices-events.publisher';
import { DeviceEmployeeEventsPublisher } from './publishers/device-employee-events.publisher';
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
        CategoryEventsPublisher,
        SourceEventsPublisher,
        DeviceEventsPublisher,
        AssignDevicesEventsPublisher,
        RetrieveDevicesEventsPublisher,
        HandoverDevicesEventsPublisher,
        DisposeDevicesEventsPublisher,
        DeviceEmployeeEventsPublisher,
    ],
    exports: [
        CategoryEventsPublisher,
        SourceEventsPublisher,
        DeviceEventsPublisher,
        AssignDevicesEventsPublisher,
        RetrieveDevicesEventsPublisher,
        HandoverDevicesEventsPublisher,
        DisposeDevicesEventsPublisher,
        DeviceEmployeeEventsPublisher,
    ],
}) export class MessagingModule {}