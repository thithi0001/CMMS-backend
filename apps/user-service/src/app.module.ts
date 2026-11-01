import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/user-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        UsersModule,
        AuthModule,
    ],
}) export class AppModule {}