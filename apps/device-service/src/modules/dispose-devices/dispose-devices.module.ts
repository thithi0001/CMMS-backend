import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DisposeDevicesService } from './dispose-devices.service';

@Module({
    imports: [DevicesModule],
    providers: [DisposeDevicesService],
    exports: [DisposeDevicesService],
})
export class DisposeDevicesModule {}
