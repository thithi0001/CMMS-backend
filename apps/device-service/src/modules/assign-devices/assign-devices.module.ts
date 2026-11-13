import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { AssignDevicesService } from './assign-devices.service';

@Module({
    imports: [CategoriesModule],
    providers: [AssignDevicesService],
    exports: [AssignDevicesService],
})
export class AssignDevicesModule {}
