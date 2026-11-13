import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/maintenance-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        TasksModule,
    ],
}) export class AppModule {}