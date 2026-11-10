import { 
    CategoryView,
    DeviceView,
} from "@app/shared";
import type { categories } from '../prisma/generated/client';

export function toCategoryView(category: categories): CategoryView {
    return {
        id: category.id,
        name: string;
        code: string;
        description: string;
        intervalValue?: string;
        intervalUnit?: Interval_Unit;
        depreciationPeriodMinMonths: string;
        depreciationPeriodMaxMonths: string;
        isActive: string;
        createdAt: string;
        updatedAt: string;
    }
}