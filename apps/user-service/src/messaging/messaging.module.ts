import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { UserEventsPublisher } from './publishers/user-events.publisher';
import { DepartmentEventsPublisher } from './publishers/department-events.publisher';
import { EmployeeEventsPublisher } from './publishers/employee-events.publisher';
import { ExpertiseEventsPublisher } from './publishers/expertise-events.publisher';

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
    providers: [UserEventsPublisher, DepartmentEventsPublisher, EmployeeEventsPublisher, ExpertiseEventsPublisher],
    exports: [UserEventsPublisher, DepartmentEventsPublisher, EmployeeEventsPublisher, ExpertiseEventsPublisher],
}) export class MessagingModule {}