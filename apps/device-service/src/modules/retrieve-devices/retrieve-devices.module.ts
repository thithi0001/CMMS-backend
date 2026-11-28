import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { RetrieveDevicesService } from './retrieve-devices.service';
import { DeviceEmployeeModule } from '../device-employee/device-employee.module';
import { RetrieveDevicesController } from './retrieve-devices.controller';

@Module({
    imports: [DevicesModule, DeviceEmployeeModule],
    controllers: [RetrieveDevicesController],
    providers: [RetrieveDevicesService],
    exports: [RetrieveDevicesService],
})
export class RetrieveDevicesModule {}
