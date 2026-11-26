import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { BUS_CLIENT, sendRpcRequest, TASK_CMD } from '@app/shared';
import type { TaskView } from '@app/shared';

@Injectable()
export class MaintenanceTasksClient {
    private readonly timeoutMs: number;

    constructor(
        @Inject(BUS_CLIENT) private readonly client: ClientProxy,
        config: ConfigService,
    ) {
        this.timeoutMs = Number(config.get('RPC_TIMEOUT_MS', 10000));
    }

    async findById(id: number): Promise<TaskView> {
        return sendRpcRequest<TaskView, number>(
            this.client,
            TASK_CMD.FIND_BY_ID,
            id,
            this.timeoutMs,
        );
    }
}
