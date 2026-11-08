import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmployeesModule } from '../employees/employees.module';

@Module({
    imports: [
        UsersModule,
        EmployeesModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: config.get<string>('JWT_EXPIRES_IN', '6h') as JwtSignOptions['expiresIn'],
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService],
}) export class AuthModule {};