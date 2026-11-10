import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/device-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        CategoriesModule,
    ],
}) export class AppModule {}