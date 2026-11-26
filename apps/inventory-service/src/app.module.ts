import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { InventorySourcesModule } from './modules/sources/sources.module';
import { ItemsModule } from './modules/items/items.module';
import { BatchesModule } from './modules/batches/batches.module';
import { UsageItemsModule } from './modules/usage-items/usage-items.module';
import { RequireItemsModule } from './modules/require-items/require-items.module';
import { StorageModule } from '@app/storage';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/inventory-service/.env', '.env'],
        }),
        PrismaModule,
        StorageModule,
        MessagingModule,
        InventorySourcesModule,
        ItemsModule,
        BatchesModule,
        UsageItemsModule,
        RequireItemsModule,
    ],
}) export class AppModule {}