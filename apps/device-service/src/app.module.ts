import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SourcesModule } from './modules/sources/sources.module';
import { DevicesModule } from './modules/devices/devices.module';

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
    ],
}) export class AppModule {}