import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { SourcesController } from './sources.controller';

@Module({ 
    controllers: [
        CategoriesController,
        SourcesController,
        
    ] 
})
export class DevicesModule {}
