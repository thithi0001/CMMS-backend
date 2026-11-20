import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { InventorySourcesModule } from './modules/sources/sources.module';
import { ItemsModule } from './modules/items/items.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/inventory-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        InventorySourcesModule,
        ItemsModule,
    ],
}) export class AppModule {}