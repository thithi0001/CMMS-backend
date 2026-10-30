import { Injectable } from '@nestjs/common';

@Injectable()
export class MaintenanceServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
