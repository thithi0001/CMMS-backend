import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { busServerOptions, QUEUES, RpcErrorFilter } from "@app/shared";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = app.get(ConfigService);

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true, 
        transform: true,
    }));

    app.useGlobalFilters(new RpcErrorFilter());

    app.connectMicroservice(
        busServerOptions(
            config.getOrThrow<string>('RABBITMQ_URL'),
            QUEUES.MAINTENANCE),
            { inheritAppConfig: true },
    );

    await app.startAllMicroservices();
    await app.init();

    Logger.log(`Maintenance-service listening queue "${QUEUES.MAINTENANCE}"`, 'Bootstrap');
}

bootstrap();