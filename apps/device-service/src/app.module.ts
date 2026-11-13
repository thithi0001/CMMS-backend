import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SourcesModule } from './modules/sources/sources.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AssignDevicesModule } from './modules/assign-devices/assign-devices.module';
import { RetrieveDevicesModule } from './modules/retrieve-devices/retrieve-devices.module';
import { HandoverDevicesModule } from './modules/handover-devices/handover-devices.module';
import { DisposeDevicesModule } from './modules/dispose-devices/dispose-devices.module';
import { DeviceEmployeeModule } from './modules/device-employee/device-employee.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/device-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        CategoriesModule,
        SourcesModule,
        DevicesModule,
        AssignDevicesModule,
        RetrieveDevicesModule,
        HandoverDevicesModule,
        DisposeDevicesModule,
        DeviceEmployeeModule,
    ],
}) export class AppModule {}