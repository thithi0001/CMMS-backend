import { 
    AssignDeviceView,
    CategoryView,
    DeviceEmployeeView,
    DeviceHistoryView,
    DeviceView,
    DisposeDeviceView,
    HandoverDeviceView,
    RetrieveDeviceView,
    SourceView,
} from "@app/shared";
import type { 
    categories, Prisma, sources, device_activity_histories,
} from '../prisma/generated/client';
import { DeviceState, IntervalUnit, SourceType, RequestStatus, HandoverType } from "@app/shared/types/device.enum";

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
    include: { categories: { select: { name: true }}};
}>;
export function toAssignDeviceView(a: AssignWithRelation): AssignDeviceView {
    return {
        id: a.id,
        category: {
            id: a.category_id,
            name: a.categories.name,
        },
        creatorId: a.creator_id,
        reason: a.reason || "",
        require: a.require || "",
        status: a.status as RequestStatus,
        approverId: a.approver_id || undefined,
        apprvedAt: a.approved_at?.toISOString(),
        createdAt: a.created_at?.toISOString() || "Missing",
    };
}

type RetrieveWithDevice = Prisma.retrieve_devicesGetPayload<{
    include: { devices: { select: { code: true }}};
}>;
export function toRetrieveDeviceView(r: RetrieveWithDevice): RetrieveDeviceView {
    return {
        id: r.id,
        device: {
            id: r.device_id,
            code: r.devices.code,
        },
        creatorId: r.creator_id,
        confirmerId: r.confirmer_id,
        handoverId: r.handover_id,
        isConfirmed: r.is_confirmed,
        requireTime: r.required_time?.toISOString(),
        createdAt: r.created_at?.toISOString(),
        updatedAt: r.updated_at?.toISOString(),
    };
}

type HandoverWithDevice = Prisma.handover_devicesGetPayload<{
    include: { devices: { select: { code: true }}};
}>;
export function toHandoverDeviceView(h: HandoverWithDevice): HandoverDeviceView {
    return {
        id: h.id,
        device: {
            id: h.device_id,
            code: h.devices.code,
        },
        creatorId: h.creator_id,
        deliverId: h.deliver_id,
        receiverId: h.receiver_id,
        type: h.type as HandoverType,
        isHandoverd: h.is_handovered,
        handoveredAt: h.handovered_at?.toISOString(),
        createdAt: h.created_at?.toISOString(),
        updatedAt: h.updated_at?.toISOString(),
    };
}

type DisposeWithDevice = Prisma.disposal_devicesGetPayload<{
    include: { devices: { select: { code: true }}};
}>;
export function toDisposeDeviceView(d: DisposeWithDevice): DisposeDeviceView {
    return {
        id: d.id,
        deviceCode: d.devices.code,
        disposalDate: d.disposal_date?.toDateString() || "Missing",
        disposalValue: d.disposal_value?.toString() || "Missing",
        createdAt: d.created_at?.toISOString(),
    };
}

type DeviceEmployeeWithDevice = Prisma.device_employeeGetPayload<{
    include: { devices: { select: { code: true }}};
}>;
export function toDeviceEmployeeView(d: DeviceEmployeeWithDevice): DeviceEmployeeView {
    return {
        id: d.id,
        device: {
            id: d.device_id,
            code: d.devices.code,
        },
        employeeId: d.employee_id,
        approverId: d.approver_id,
        isReturned: d.is_returned,
        assignedAt: d.assigned_at?.toISOString() || "Missing",
        returnedAt: d.returned_at?.toISOString(),
        createdAt: d.created_at?.toISOString(),
        updatedAt: d.updated_at?.toISOString(),
    };
}
