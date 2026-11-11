import { 
    AssignDeviceView,
    CategoryView,
    DeviceHistoryView,
    DeviceView,
    SourceView,
} from "@app/shared";
import type { 
    categories, Prisma, sources, device_activity_histories,
    assign_devices, 
} from '../prisma/generated/client';
import { DeviceState, IntervalUnit, SourceType, RequestStatus } from "@app/shared/types/device.enum";

export function toCategoryView(category: categories): CategoryView {
    return {
        id: category.id,
        name: category.name,
        code: category.code,
        description: category.description || "",
        intervalValue: category.interval_value || undefined,
        intervalUnit: category.interval_unit as IntervalUnit,
        depreciationPeriodMinMonths: category.depreciation_period_min_months || undefined,
        depreciationPeriodMaxMonths: category.depreciation_period_max_months || undefined,
        isActive: category.is_active,
        createdAt: category.created_at?.toISOString(),
        updatedAt: category.updated_at?.toISOString(),
    };
}

export function toSourceView(source: sources): SourceView {
    return {
        id: source.id,
        name: source.name,
        type: source.type as SourceType,
        createdAt: source.created_at?.toISOString(),
        updatedAt: source.updated_at?.toISOString(),
    };
}

type DeviceWithRelations = Prisma.devicesGetPayload<{
    include: {
        categories: { select: { name: true } };
        sources_devices_manufacturer_idTosources: { select: { name: true } };
        sources_devices_supplier_idTosources: { select: { name: true } };
    };
}>;
export function toDeviceView(device: DeviceWithRelations): DeviceView {
    return {
        id: device.id,
        category: {
            id: device.category_id,
            name: device.categories.name,
        },
        manufacturer: {
            id: device.manufacturer_id,
            name: device.sources_devices_manufacturer_idTosources.name,
        },
        supplier: {
            id: device.supplier_id,
            name: device.sources_devices_supplier_idTosources.name,
        },
        code: device.code,
        model: device.model || undefined,
        serialNumber: device.serial_number || undefined,
        manufactureDate: device.manufacture_date?.toDateString(),
        purchaseDate: device.purchase_date?.toDateString(),
        purchasePrice: device.purchase_price?.toString(),
        originalCost: device.original_cost?.toString(),
        specifications: device.specifications,
        imgUrl: device.img_url || undefined,
        installLocation: device.install_location || undefined,
        state: device.state as DeviceState,
        lastMaintenanceAt: device.last_maintenance_at?.toDateString(),
        createdAt: device.created_at?.toISOString(),
        updatedAt: device.updated_at?.toISOString(),
    };
}

export function toDeviceHistoryView(history: device_activity_histories): DeviceHistoryView {
    return {
        id: history.id,
        oldState: history.old_state as DeviceState,
        newState: history.new_state as DeviceState,
        createdAt: history.created_at?.toISOString() || "Missing",
    };
}

type AssignWithRelation = Prisma.assign_devicesGetPayload<{
    include: {
        categories: { select: { name: true }},
    };
}>;
export function toAssignDeviceView(a: AssignWithRelation): AssignDeviceView {
    return {
        id: a.id,
        creatorId: a.creator_id,
        category: {
            id: a.category_id,
            name: a.categories.name,
        },
        reason: a.reason || "",
        require: a.require || "",
        status: a.status as RequestStatus,
        approverId: a.approver_id || undefined,
        apprvedAt: a.approved_at?.toISOString(),
        createdAt: a.created_at?.toISOString() || "Missing",
    };
}