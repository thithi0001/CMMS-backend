import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DISPOSE_PROPOSAL_EVT,
    DisposeProposalView, DisposeProposalEventPayload,
} from '@app/shared';

@Injectable()
export class DisposeProposalEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DisposeProposalEventsPublisher.name);

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

    created(d: DisposeProposalView, actorId: number) {
        this.publish<DisposeProposalEventPayload>(DISPOSE_PROPOSAL_EVT.CREATED, {
            proposalId: d.id,
            creatorId: d.creatorId,
            taskId: d.taskId
        }, actorId);
    }

    updated(d: DisposeProposalView, changedFields: string[], actorId: number) {
        this.publish<DisposeProposalEventPayload>(DISPOSE_PROPOSAL_EVT.UPDATED, {
            proposalId: d.id,
            creatorId: d.creatorId,
            taskId: d.taskId,
            changedFields
        }, actorId);
    }
    
    deleted(d: DisposeProposalView, actorId: number) {
        this.publish<DisposeProposalEventPayload>(DISPOSE_PROPOSAL_EVT.DELETED, {
            proposalId: d.id,
            creatorId: d.creatorId,
            taskId: d.taskId
        }, actorId);
    }
    
}