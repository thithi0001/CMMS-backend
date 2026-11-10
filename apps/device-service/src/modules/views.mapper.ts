import { 
    CategoryView,
    DeviceView,
} from "@app/shared";
import type { categories } from '../prisma/generated/client';
import { Interval_Unit } from "@app/shared/types/device.enum";

export function toCategoryView(category: categories): CategoryView {
    return {
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description || "",
        intervalValue: category.interval_value || undefined,
        intervalUnit: category.interval_unit as Interval_Unit,
        depreciationPeriodMinMonths: category.depreciation_period_min_months || undefined,
        depreciationPeriodMaxMonths: category.depreciation_period_max_months || undefined,
        isActive: category.is_active,
        createdAt: category.created_at?.toISOString(),
        updatedAt: category.updated_at?.toISOString(),
    };
}