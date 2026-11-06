import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DepartmentsController } from './departments.controller';
import { EmployeesController } from './employees.controller';
import { ExpertisesController } from './expertises.controller';

@Module({ 
    controllers: [
        UsersController,
        DepartmentsController,
        EmployeesController,
        ExpertisesController,
    ] 
})
export class UsersModule {}
