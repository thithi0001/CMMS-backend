import { DownloadUrl, UploadTicket } from "../storage";
import { DeviceState, IntervalUnit, DeviceSourceType, RequestStatus, HandoverType } from "./device.enums";

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

export interface DeviceSourceView {
    id: number;
    name: string;
    code: string;
    type: DeviceSourceType;
    createdAt?: string;
    updatedAt?: string;
}

export interface DeviceImageView extends DownloadUrl {
    id: number;
}

export interface DeviceImageUploadTicket extends UploadTicket {
    imageId: number;
}

export interface DeviceView {
    id: number;
    category: { id: number; name: string; };
    manufacturer: { id: number; name: string; };
    supplier: { id: number; name: string; };
    code: string;
    model?: string;
    serialNumber?: string;
    manufactureDate?: string;
    purchaseDate?: string;
    purchasePrice?: string;
    originalCost?: string;
    specifications?: JsonValue;
    installLocation?: string;
    state: DeviceState;
    lastMaintenanceAt?: string;
    images: DeviceImageView[];
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
    category: {
        id: number;
        name: string;
    };
    creatorId: number;
    reason: string;
    require: string;
    status: RequestStatus;
    approverId?: number;
    apprvedAt?: string;
    createdAt: string;
}

export interface RetrieveDeviceView {
    id: number;
    device: {
        id: number;
        code: string;
    };
    creatorId: number;
    confirmerId?: number | null;
    handoverId?: number | null;
    isConfirmed: boolean;
    requireTime?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface HandoverDeviceView {
    id: number;
    device: {
        id: number;
        code: string;
    };
    creatorId: number;
    deliverId: number;
    receiverId: number;
    taskId?: number;
    type: HandoverType;
    isHandoverd: boolean;
    handoveredAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DisposeDeviceView {
    id: number;
    creatorId: number;
    deviceCode: string;
    disposalDate: string;
    disposalValue: string;
    reason?: string;
    createdAt?: string;
}

export interface DeviceEmployeeView {
    id: number;
    device: {
        id: number;
        code: string;
    };
    employeeId: number;
    approverId: number;
    isReturned: boolean;
    assignedAt: string;
    returnedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}
