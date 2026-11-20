import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    Paginated,
    Role,
    myParseDate,
} from '@app/shared';
import {  } from '../../messaging/publishers/usage-item-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toUsageItemView } from '../views.mapper';

@Injectable()
export class UsageItemsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: ,
    ) {}

    // === Nội bộ ===
    findUsageItemById(id: number) {
        return this.prisma.usage_item_lists.findUnique({ 
            where: { id },
            include: { usage_item_details: { orderBy: { updated_at: 'asc'}}},
        });
    }
    
    // === RPC ===
    findById
    findAll
    create -> items.calculate
    update -> items.calculate
    delete -> items.calculate
}