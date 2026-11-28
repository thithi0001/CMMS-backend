import { Role } from "@app/shared/types/role";
import { DeviceState, DeviceSourceType } from "./device.enums";

export interface CategoryEventPayload {
    categoryId: number;
    categoryCode: string;
}

export interface CategoryUpdatePayload {
    categoryId: number;
    changedFields: string[];
}

export interface DeviceSourceEventPayload {
    sourceId: number;
    sourceCode: string;
    changedFields?: string[];
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
    actorRole: Role;
    changedFields?: string[];
}

export interface HandoverDevicePayload {
    handoverDeviceId: number;
    deviceCode: string;
    creatorId: number;
    taskId?: number;
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
    approverId: number,
    newState?: DeviceState,
    changedFields?: string[],
}
