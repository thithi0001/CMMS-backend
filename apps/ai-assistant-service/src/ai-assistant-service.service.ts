import { Injectable } from '@nestjs/common';

@Injectable()
export class AiAssistantServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
