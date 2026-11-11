import { DeviceState, IntervalUnit, SourceType, RequestStatus } from "@app/shared/types/device.enum";

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export interface CategoryView {
    id: number;
    name: string;
    code: string;
    description?: string;
    intervalValue?: number;
    intervalUnit?: IntervalUnit;
    depreciationPeriodMinMonths?: number;
    depreciationPeriodMaxMonths?: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface SourceView {
    id: number;
    name: string;
    type: SourceType;
    createdAt?: string;
    updatedAt?: string;
}

export interface DeviceView {
    id: number,
    category: { id: number, name: string },
    manufacturer: { id: number, name: string },
    supplier: { id: number, name: string },
    code: string;
    model?: string;
    serialNumber?: string;
    manufactureDate?: string;
    purchaseDate?: string;
    purchasePrice?: string;
    originalCost?: string;
    specifications?: JsonValue;
    imgUrl?: string;
    installLocation?: string;
    state: DeviceState;
    lastMaintenanceAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DeviceHistoryView {
    id: number;
    oldState: DeviceState;
    newState: DeviceState;
    createdAt: string;
}

export interface AssignDeviceView {
    id: number;
    creatorId: number;
    category: {
        id: number;
        name: string,
    },
    reason: string;
    require: string;
    status: RequestStatus;
    approverId?: number;
    apprvedAt?: string;
    createdAt: string;
}