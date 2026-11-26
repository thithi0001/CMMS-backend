import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import {
    CreateDeviceSourceDto,
    CreateSourceMsg,
    FindDeviceSourceQueryDto,
    Paginated,
    DeviceSourceView,
    UpdateSourceMsg,
} from '@app/shared';
import { DeviceSourceEventsPublisher } from '../../messaging/publishers/source-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSourceView } from '../views.mapper';

@Injectable()
export class DeviceSourcesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: DeviceSourceEventsPublisher,
    ) {}

    // === Nội bộ ===
    findSourceById(id: number) {
        return this.prisma.sources.findUnique({
            where: { id },
        });
    }

    async createSource(dto: CreateDeviceSourceDto): Promise<DeviceSourceView> {
        const source = await this.prisma.sources.create({
            data: {
                name: dto.name,
                type: dto.type,
            },
        });

        return toSourceView(source);
    }

    // === RPC ===
    async create({ dto, actor }: CreateSourceMsg): Promise<DeviceSourceView> {
        const source = await this.createSource(dto);
        this.events.created(source, actor.sub);
        return source;
    }

    async findAll(q: FindDeviceSourceQueryDto): Promise<Paginated<DeviceSourceView>> {
        const {
            page = 1,
            limit = 20,
        } = q;
        const where: Prisma.sourcesWhereInput = {
            ...(q.search && {
                name: { contains: q.search, mode: 'insensitive' },
            }),
            ...(q.type && { type: q.type }),
        };

        const [total, sources] = await this.prisma.$transaction([
            this.prisma.sources.count({ where }),
            this.prisma.sources.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { name: 'asc' },
            }),
        ]);

        return {
            items: sources.map(toSourceView),
            total, page, limit
        };
    }

    async findById(id: number): Promise<DeviceSourceView> {
        const source = await this.findSourceById(id);
        if (!source)
            throw new NotFoundException('Source not found');

        return source;
    }
    
    async udpate({ id, data, actor }: UpdateSourceMsg): Promise<DeviceSourceView> {
        await this.findById(id);

        const source = await this.prisma.sources.update({
            where: { id },
            data: { 
                name: data.name,
                updated_at: new Date(),
            },
        });
        const view = toSourceView(source);
        this.events.updated(view, actor.sub);
        return view;
    }

}
