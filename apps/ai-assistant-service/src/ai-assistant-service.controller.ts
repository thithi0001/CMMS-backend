import { Controller, Get } from '@nestjs/common';
import { AiAssistantServiceService } from './ai-assistant-service.service';

@Controller()
export class AiAssistantServiceController {
  constructor(private readonly aiAssistantServiceService: AiAssistantServiceService) {}

  @Get()
  getHello(): string {
    return this.aiAssistantServiceService.getHello();
  }
}
