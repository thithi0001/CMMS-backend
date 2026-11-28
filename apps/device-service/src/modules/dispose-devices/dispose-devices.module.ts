import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DisposeDevicesService } from './dispose-devices.service';
import { DisposeDevicesController } from './dispose-devices.controller';

@Module({
    imports: [DevicesModule],
    controllers: [DisposeDevicesController],
    providers: [DisposeDevicesService],
    exports: [DisposeDevicesService],
})
export class DisposeDevicesModule {}
