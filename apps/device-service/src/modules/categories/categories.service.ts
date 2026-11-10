import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    CreateUserMsg, DeactivateUserMsg, UpdateRoleMsg, UpdateUserMsg,
    FindUserQueryDto, CreateUserDto,
    Paginated,
    UserStats, UserView,
    Role,
} from '@app/shared';
import { CategoryEventsPublisher } from '../../messaging/publishers/category-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toCategoryView } from '../views.mapper';
