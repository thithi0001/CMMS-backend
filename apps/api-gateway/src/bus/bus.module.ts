import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { BUS_CLIENT, busClientOptions } from '@app/shared';
import { BusService } from './bus.service';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: BUS_CLIENT,
                inject: [ConfigService],
                useFactory: (config: ConfigService) => 
                    busClientOptions(config.getOrThrow<string>('RABBITMQ_URL')),
            },
        ]),
    ],
    providers: [BusService],
    exports: [BusService],
}) export class BusModule {}