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

