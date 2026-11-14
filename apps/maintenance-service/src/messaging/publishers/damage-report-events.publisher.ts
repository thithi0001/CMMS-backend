import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DAMAGE_REPORT_EVT,
    DamageReportView, DamageReportEventPayload,
} from '@app/shared';

@Injectable()
export class DamageReportEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DamageReportEventsPublisher.name);

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

    created(a: DamageReportView, actorId: number) {
        this.publish<DamageReportEventPayload>(DAMAGE_REPORT_EVT.CREATED, {
            reportId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId
        }, actorId);
    }

    updated(a: DamageReportView, changedFields: string[], actorId: number) {
        this.publish<DamageReportEventPayload>(DAMAGE_REPORT_EVT.UPDATED, {
            reportId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId,
            changedFields
        }, actorId);
    }
    
    deleted(a: DamageReportView, actorId: number) {
        this.publish<DamageReportEventPayload>(DAMAGE_REPORT_EVT.DELETED, {
            reportId: a.id,
            creatorId: a.creatorId,
            taskId: a.taskId
        }, actorId);
    }
    
}