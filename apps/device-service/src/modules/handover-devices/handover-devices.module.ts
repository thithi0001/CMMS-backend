import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { HandoverDevicesService } from './handover-devices.service';
import { HandoverDevicesController } from './handover-devices.controller';

@Module({
    imports: [DevicesModule],
    controllers: [HandoverDevicesController],
    providers: [HandoverDevicesService],
    exports: [HandoverDevicesService],
})
export class HandoverDevicesModule {}
