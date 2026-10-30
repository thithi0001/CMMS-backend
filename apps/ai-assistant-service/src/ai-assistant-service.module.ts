import { Module } from '@nestjs/common';
import { AiAssistantServiceController } from './ai-assistant-service.controller';
import { AiAssistantServiceService } from './ai-assistant-service.service';

@Module({
  imports: [],
  controllers: [AiAssistantServiceController],
  providers: [AiAssistantServiceService],
})
export class AiAssistantServiceModule {}
