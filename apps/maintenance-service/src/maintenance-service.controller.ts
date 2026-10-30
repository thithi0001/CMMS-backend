import { Controller, Get } from '@nestjs/common';
import { MaintenanceServiceService } from './maintenance-service.service';

@Controller()
export class MaintenanceServiceController {
  constructor(private readonly maintenanceServiceService: MaintenanceServiceService) {}

  @Get()
  getHello(): string {
    return this.maintenanceServiceService.getHello();
  }
}
