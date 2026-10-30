import { NestFactory } from '@nestjs/core';
import { DeviceServiceModule } from './device-service.module';

async function bootstrap() {
  const app = await NestFactory.create(DeviceServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
