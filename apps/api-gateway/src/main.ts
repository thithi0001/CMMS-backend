import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RpcToHttpFilter } from './common/filters/rpc-to-http.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*')
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }),
  );
  app.useGlobalFilters(new RpcToHttpFilter());

  const port = Number(config.get('PORT', 3000));
  await app.listen(port);
  Logger.log(`api-gateway listen on http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap();
