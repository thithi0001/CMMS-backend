import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { RetrieveDevicesService } from './retrieve-devices.service';

@Module({
    imports: [DevicesModule],
    providers: [RetrieveDevicesService],
    exports: [RetrieveDevicesService],
})
export class RetrieveDevicesModule {}
