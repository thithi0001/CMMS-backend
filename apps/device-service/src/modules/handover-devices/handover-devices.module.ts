import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { HandoverDevicesService } from './handover-devices.service';

@Module({
    imports: [DevicesModule],
    providers: [HandoverDevicesService],
    exports: [HandoverDevicesService],
})
export class HandoverDevicesModule {}
