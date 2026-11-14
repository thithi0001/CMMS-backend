import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, ASSIGNEE_EVT,
    AssigneeView, AssigneeEventPayload,
} from '@app/shared';

@Injectable()
export class AssigneeEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(AssigneeEventsPublisher.name);

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

    created(a: AssigneeView, actorId: number) {
        this.publish<AssigneeEventPayload>(ASSIGNEE_EVT.CREATED, {
            id: a.id,
            assigneeId: a.assigneeId,
            taskId: a.taskId
        }, actorId);
    }

    updated(a: AssigneeView, changedFields: string[], actorId: number) {
        this.publish<AssigneeEventPayload>(ASSIGNEE_EVT.UPDATED, {
            id: a.id,
            assigneeId: a.assigneeId,
            taskId: a.taskId,
            changedFields
        }, actorId);
    }
    
    deleted(a: AssigneeView, actorId: number) {
        this.publish<AssigneeEventPayload>(ASSIGNEE_EVT.DELETED, {
            id: a.id,
            assigneeId: a.assigneeId,
            taskId: a.taskId
        }, actorId);
    }
    
}