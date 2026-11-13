import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, TASK_EVT,
    TaskView, 
    TaskEventPayload,
    TaskStageChangePayload,
    TaskStage
} from '@app/shared';

@Injectable()
export class TaskEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(TaskEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.MAINTENANCE, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(t: TaskView, actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.CREATED, {
            taskId: t.id,
            creatorId: t.creatorId,
            stage: t.stage
        }, actorId);
    }

    updated(t: TaskView, changedFields: string[], actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.UPDATED, {
            taskId: t.id,
            creatorId: t.creatorId,
            stage: t.stage,
            changedFields
        }, actorId);
    }

    deleted(t: TaskView, actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.DELETED, {
            taskId: t.id,
            creatorId: t.creatorId,
            stage: t.stage
        }, actorId);
    }

    stageChanged(t: TaskView, oldStage: TaskStage, actorId: number) {
        this.publish<TaskStageChangePayload>(TASK_EVT.STAGE_CHANGED, {
            taskId: t.id,
            creatorId: t.creatorId,
            oldStage,
            newStage: t.stage
        }, actorId);
    }
}