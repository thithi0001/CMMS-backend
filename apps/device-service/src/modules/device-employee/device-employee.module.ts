import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DeviceEmployeeService } from './device-employee.service';
import { DeviceEmployeeController } from './device-employee.controller';

@Module({
    imports: [DevicesModule],
    controllers: [DeviceEmployeeController],
    providers: [DeviceEmployeeService],
    exports: [DeviceEmployeeService],
})
export class DeviceEmployeeModule {}
