import {
  Body, Controller, Delete, Get, Param, 
  ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import type {
    JwtPayload, Paginated, 
} from '@app/shared';
import { TASK_CMD, Role } from '@app/shared';
import { BusService } from '../../bus/bus.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('tasks')
export class TasksController {
    constructor(
        private readonly bus: BusService
    ) {}

    
}