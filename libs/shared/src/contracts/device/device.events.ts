import { DeviceState, SourceType } from "@app/shared/types/device.enum";

export interface CategoryEventPayload {
    categoryId: number;
    categoryName: string;
    categoryCode: string;
}

export interface CategoryUpdatePayload {
    categoryId: number;
    changedFields: string[];
}

export interface SourceEventPayload {
    sourceId: number;
    sourceName: string;
    sourceType: SourceType;
}

export interface DeviceEventPayload {
    deviceId: number;
    deviceCode: string;
    changedFields?: string[];
}

export interface DeviceStateChangePayload {
    deviceId: number;
    deviceCode: string;
    oldState: DeviceState;
    newState: DeviceState;
}

export interface AssignDevicePayload {
    assignDeviceId: number;
    creatorId: number;
    changedFields?: string[];
}

export interface RetrieveDevicePayload {
    retrieveDeviceId: number;
    deviceCode: string;
    creatorId: number;
    changedFields?: string[];
}

export interface HandoverDevicePayload {
    handoverDeviceId: number;
    deviceCode: string;
    creatorId: number;
    changedFields?: string[];
}

export interface DisposeDevicePayload {
    deviceId: number;
    deviceCode: string;
    creatorId: number;
}

export interface DeviceEmployeePayload {
    id: number,
    deviceId: number,
    deviceCode: string,
    employeeId: number,
    apporverId: number,
    changedFields?: string[],
}
