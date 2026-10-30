import { Module } from '@nestjs/common';
import { MaintenanceServiceController } from './maintenance-service.controller';
import { MaintenanceServiceService } from './maintenance-service.service';

@Module({
  imports: [],
  controllers: [MaintenanceServiceController],
  providers: [MaintenanceServiceService],
})
export class MaintenanceServiceModule {}
