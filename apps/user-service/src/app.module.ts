import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MessagingModule } from './messaging/messaging.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpertisesModule } from './modules/expertises/expertises.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['apps/user-service/.env', '.env'],
        }),
        PrismaModule,
        MessagingModule,
        AuthModule,
        UsersModule,
        DepartmentsModule,
        EmployeesModule,
        ExpertisesModule,
    ],
}) export class AppModule {}