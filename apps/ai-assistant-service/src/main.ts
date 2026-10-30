import { NestFactory } from '@nestjs/core';
import { AiAssistantServiceModule } from './ai-assistant-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AiAssistantServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
