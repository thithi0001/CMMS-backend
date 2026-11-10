import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    buildEvent, BUS_CLIENT, SERVICES, TASK_EVT,
    TaskView, 
    TaskEventPayload,
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

    create(t: TaskView, actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.CREATED, {

        }, actorId);
    }

    update(t: TaskView, actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.UPDATED, {

        }, actorId);
    }

    delete(t: TaskView, actorId: number) {
        this.publish<TaskEventPayload>(TASK_EVT.DELETED, {

        }, actorId);
    }

}