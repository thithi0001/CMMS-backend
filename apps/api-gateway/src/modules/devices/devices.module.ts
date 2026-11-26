import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { DevicesController } from './devices.controller';
import { SourcesController } from './sources.controller';

@Module({ 
    controllers: [
        CategoriesController,
        DevicesController,
        SourcesController,
    ] 
})
export class DevicesModule {}
