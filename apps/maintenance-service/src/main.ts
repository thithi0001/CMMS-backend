import { NestFactory } from '@nestjs/core';
import { MaintenanceServiceModule } from './maintenance-service.module';

async function bootstrap() {
  const app = await NestFactory.create(MaintenanceServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
