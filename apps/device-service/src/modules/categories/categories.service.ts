import {
    BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException
} from '@nestjs/common';
import {
    Paginated,
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

    // === RPC ===
    async create({ dto, actor }: CreateCategoryMsg): Promise<CategoryView> {
        const max = dto.depreciationPeriodMaxMonths;
        const min = dto.depreciationPeriodMinMonths;
        if (max && min && max < min)
            throw new ConflictException(
                'The maximum depreciation period value must be greater than the minimum depreciation period value');

        if (
            (dto.intervalValue && !dto.intervalUnit)
            || (!dto.intervalValue && dto.intervalUnit)
        ) {
            throw new BadRequestException(
                'Both internal value and internal unit must be defined together');
        }
        
        const category = await this.prisma.categories.create({
            data: {
                name: dto.name,
                code: dto.code,
                description: dto.description,
                interval_value: dto.intervalValue,
                interval_unit: dto.intervalUnit,
                depreciation_period_min_months: min,
                depreciation_period_max_months: max,
            },
        });
        const view = toCategoryView(category);
        this.events.created(view, actor.sub);
        return view;
    }

    async findAll(q: FindCategoryQueryDto): Promise<Paginated<CategoryView>> {
        const { page = 1, limit = 20, isActive = true } = q;
        const where: Prisma.categoriesWhereInput = {
            is_active: isActive,
            ...(q.search && {
                OR: [
                    { code: { startsWith: q.search, mode: 'insensitive' }},
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
        const category = await this.prisma.categories.findUnique({ where: { id }});
        if (!category) throw new NotFoundException('Category not found');
        return toCategoryView(category);
    }

    async update({ id, data, actor }: UpdateCategoryMsg): Promise<CategoryView> {
        const category = await this.findById(id);

        const min = data.depreciationPeriodMinMonths? data.depreciationPeriodMinMonths : category.depreciationPeriodMinMonths;
        const max = data.depreciationPeriodMaxMonths? data.depreciationPeriodMaxMonths : category.depreciationPeriodMaxMonths;
        if (max && min && max < min)
            throw new ConflictException(
                'The maximum depreciation period value must be greater than the minimum depreciation period value');

        if (
            (data.intervalValue && !data.intervalUnit)
            || (!data.intervalValue && data.intervalUnit)
        ) {
            throw new BadRequestException(
                'Both internal value and internal unit must be defined together');
        }

        if (data.code !== undefined && data.code !== category.code) {
            const codeOwner = await this.prisma.categories.findUnique({
                where: { code: data.code },
                select: { id: true },
            });
            if (codeOwner && codeOwner.id !== id)
                throw new ConflictException('Category code already exists');
        }

        const patch = {
            name: data.name,
            code: data.code,
            description: data.description,
            interval_value: data.intervalValue,
            interval_unit: data.intervalUnit,
            depreciation_period_min_months: min,
            depreciation_period_max_months: max,
        };
        const changedFields = Object.entries(patch)
            .filter(([,v]) => v !== undefined)
            .map(([k]) => k);
        if (!changedFields.length) return category;
        
        const updated = await this.prisma.categories.update({
            where: { id }, data: patch,
        });
        this.events.updated(category.id, changedFields, actor.sub);
        return toCategoryView(updated);
    }
    
    async delete({ id, actor }: DeleteCategoryMsg): Promise<CategoryView> {
        await this.findById(id);

        const deleted = await this.prisma.categories.update({
            where: { id },
            data: { is_active: false },
        });
        const view = toCategoryView(deleted);
        this.events.deleted(view, actor.sub);
        return view;
    }
}
