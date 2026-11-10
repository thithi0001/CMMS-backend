import {
    ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
    Paginated,
    CreateCategoryDto,
    CategoryView,
    CreateCategoryMsg,
    FindCategoryQueryDto,
    UpdateCategoryMsg,
    DeleteCategoryMsg,
} from '@app/shared';
import { CategoryEventsPublisher } from '../../messaging/publishers/category-events.publisher';
import { Prisma } from '../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toCategoryView } from '../views.mapper';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly events: CategoryEventsPublisher,
    ) {}

    // === Nội bộ ===
    findCategoryById(id: number) {
        return this.prisma.categories.findUnique({
            where: { id },
        });
    }

    async createCategory(dto: CreateCategoryDto): Promise<CategoryView> {
        if (dto.depreciationPeriodMinMonths && dto.depreciationPeriodMaxMonths)
            if (dto.depreciationPeriodMaxMonths < dto.depreciationPeriodMinMonths)
                throw new ConflictException('The maximum depreciation period value must be greater than the minimum depreciation period value');
        
        const category = await this.prisma.categories.create({
            data: {
                name: dto.name,
                code: dto.code,
                description: dto.description,
                interval_value: dto.intervalValue,
                interval_unit: dto.intervalUnit,
                depreciation_period_min_months: dto.depreciationPeriodMinMonths,
                depreciation_period_max_months: dto.depreciationPeriodMaxMonths,
            },
        });

        return toCategoryView(category);
    }

    // === RPC ===
    async create({ dto, actor }: CreateCategoryMsg): Promise<CategoryView> {
        const category = await this.createCategory(dto);
        this.events.created(category, actor.sub);
        return category;
    }

    async findAll(q: FindCategoryQueryDto): Promise<Paginated<CategoryView>> {
        const {
            page = 1,
            limit = 20,
            isActive = true,
        } = q;
        const where: Prisma.categoriesWhereInput = {
            is_active: isActive,
            ...(q.search && {
                OR: [
                    { code: { contains: q.search, mode: 'insensitive' }},
                    { name: { contains: q.search, mode: 'insensitive' }},
                ],
            }),
        };

        const [total, categories] = await this.prisma.$transaction([
            this.prisma.categories.count({ where }),
            this.prisma.categories.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { code: 'asc' },
            }),
        ]);

        return {
            items: categories.map(toCategoryView),
            total, page, limit
        };
    }

    async findById(id: number): Promise<CategoryView> {
        const category = await this.findCategoryById(id);
        if (!category)
            throw new NotFoundException('Category not found');
        return toCategoryView(category);
    }

    async update({ id, data, actor }: UpdateCategoryMsg): Promise<CategoryView> {
        const category = await this.findById(id);

        const min = data.depreciationPeriodMinMonths? data.depreciationPeriodMinMonths : category.depreciationPeriodMinMonths;
        const max = data.depreciationPeriodMaxMonths? data.depreciationPeriodMaxMonths : category.depreciationPeriodMaxMonths;
        if (max < min)
            throw new ConflictException('The maximum depreciation period value must be greater than the minimum depreciation period value');

        const patch = {
            name: data.name,
            code: data.code,
            description: data.description,
            interval_value: data.intervalValue,
            interval_unit: data.intervalUnit,
            depreciation_period_min_months: data.depreciationPeriodMinMonths,
            depreciation_period_max_months: data.depreciationPeriodMaxMonths,
        };

        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);

        const updated = await this.prisma.categories.update({
            where: { id },
            data: patch,
        });

        if (changedFields.length)
            this.events.updated(id, changedFields, actor.sub);

        return toCategoryView(updated);
    }
    
    async delete({ id, actor }: DeleteCategoryMsg): Promise<CategoryView> {
        const category = await this.findById(id);

        const deleted = await this.prisma.categories.update({
            where: { id },
            data: {
                is_active: false,
            },
        });
        const view = toCategoryView(deleted);
        this.events.deleted(view, actor.sub);

        return view;
    }
}
