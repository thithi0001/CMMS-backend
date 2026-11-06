import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, DEPARTMENT_EVT,
    DepartmentView, DepartmentEventPayload, 
} from '@app/shared';

@Injectable()
export class DepartmentEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(DepartmentEventsPublisher.name);

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

    created(d: DepartmentView, actorId: number) {
        this.publish<DepartmentEventPayload>(DEPARTMENT_EVT.CREATED, {
            departmentId: d.id,
            departmentCode: d.code,
            departmentName: d.name
        }, actorId);
    }
}