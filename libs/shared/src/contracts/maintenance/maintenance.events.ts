import { TaskStage } from "@app/shared";

export interface TaskEventPayload {
    taskId: number;
    creatorId: number;
    stage: TaskStage;
    changedFields?: string[];
}

export interface TaskStageChangePayload {
    taskId: number;
    creatorId: number;
    oldStage: TaskStage;
    newStage: TaskStage;
}

export interface TicketEventPayload {
    ticketId: number;
    creatorId: number;
    deviceId: number;
    confirmerId?: number;
    changedFields?: string[];
}

export interface AcceptanceEventPayload {
    acceptanceId: number;
    creatorId: number;
    taskId: number;
    changedFields?: string[];
}