import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, EXPERTISE_EVT, 
    ExpertiseEventPayload, ExpertiseView,
    AssignExpertiseView,
} from '@app/shared';

@Injectable()
export class ExpertiseEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(ExpertiseEventsPublisher.name);

    constructor(
        @Inject(BUS_CLIENT) 
        private readonly bus: ClientProxy
    ) {}

    async onApplicationBootstrap() {
        await this.bus.connect();
    }
    
    private publish<T>(type: string, data: T, actorId?: number) {
        const event = buildEvent({ 
            type, source: SERVICES.USER, data, actorId 
        });
        
        this.bus.emit(type, event).subscribe({
            error: (err) => this.logger.error(`Fail to publish ${type}: ${err?.message ?? err}`),
        });
    }

    created(e: ExpertiseView, actorId: number) {
        this.publish<ExpertiseEventPayload>(EXPERTISE_EVT.CREATED, {
            expertiseId: e.id,
            expertiseCode: e.code,
        }, actorId);
    }

    assigned(e: AssignExpertiseView, actorId: number) {
        this.publish<ExpertiseEventPayload>(EXPERTISE_EVT.ASSIGNED, {
            userId: e.userId,
            expertiseId: e.expertiseId,
            assignedAt: e.assignedAt,
        }, actorId);
    }

    revoked(e: AssignExpertiseView, actorId: number) {
        this.publish<ExpertiseEventPayload>(EXPERTISE_EVT.REVOKED, {
            userId: e.userId,
            expertiseId: e.expertiseId,
            revokedAt: e.revokedAt,
        }, actorId);
    }
}