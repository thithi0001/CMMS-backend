import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { AssignDevicesService } from './assign-devices.service';
import { AssignDevicesController } from './assign-devices.controller';

@Module({
    imports: [CategoriesModule],
    controllers: [AssignDevicesController],
    providers: [AssignDevicesService],
    exports: [AssignDevicesService],
})
export class AssignDevicesModule {}
