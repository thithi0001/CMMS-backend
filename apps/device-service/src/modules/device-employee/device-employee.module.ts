import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DeviceEmployeeService } from './device-employee.service';

@Module({
    imports: [DevicesModule],
    providers: [DeviceEmployeeService],
    exports: [DeviceEmployeeService],
})
export class DeviceEmployeeModule {}
