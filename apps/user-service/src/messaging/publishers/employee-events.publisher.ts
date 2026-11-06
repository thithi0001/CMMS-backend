import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, EMPLOYEE_EVT,
    EmployeeView, EmployeeEventPayload, 
} from '@app/shared';

@Injectable()
export class EmployeeEventsPublisher implements OnApplicationBootstrap {
    private readonly logger = new Logger(EmployeeEventsPublisher.name);

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

    created(e: EmployeeView, actorId: number) {
        this.publish<EmployeeEventPayload>(EMPLOYEE_EVT.CREATED, {
            employeeId: e.id,
            userId: e.userId,
            departmentId: e.department.id,
            position: e.position,
            startDate: e.startDate,
            endDate: e.endDate,
        }, actorId);
    }
    
    ended(e: EmployeeView, actorId: number) {
        this.publish<EmployeeEventPayload>(EMPLOYEE_EVT.ENDED, {
            employeeId: e.id,
            userId: e.userId,
            departmentId: e.department.id,
            position: e.position,
            startDate: e.startDate,
            endDate: e.endDate,
        }, actorId);
    }
}