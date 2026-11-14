import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, TASK_PROPOSAL_EVT,
    TaskProposalView, TaskProposalEventPayload,
} from '@app/shared';

@Injectable()
export class TaskProposalEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(TaskProposalEventsPublisher.name);

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

    created(t: TaskProposalView, actorId: number) {
        this.publish<TaskProposalEventPayload>(TASK_PROPOSAL_EVT.CREATED, {
            proposalId: t.id,
            creatorId: t.creatorId,
            taskId: t.taskId
        }, actorId);
    }

    updated(t: TaskProposalView, changedFields: string[], actorId: number) {
        this.publish<TaskProposalEventPayload>(TASK_PROPOSAL_EVT.UPDATED, {
            proposalId: t.id,
            creatorId: t.creatorId,
            taskId: t.taskId,
            changedFields
        }, actorId);
    }
    
    deleted(t: TaskProposalView, actorId: number) {
        this.publish<TaskProposalEventPayload>(TASK_PROPOSAL_EVT.DELETED, {
            proposalId: t.id,
            creatorId: t.creatorId,
            taskId: t.taskId
        }, actorId);
    }
    
}