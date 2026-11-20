import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    Paginated,
    Role,
    myParseDate,
} from '@app/shared';
import {  } from '../../messaging/publishers/batch-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toBatchView } from '../views.mapper';

@Injectable()
export class BatchesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: ,
    ) {}

    // === Nội bộ ===
    findBatchById(id: number) {
        return this.prisma.batches.findUnique({ where: { id }});
    }
    
    // === RPC ===
    findById
    findAll
    create
    update

}