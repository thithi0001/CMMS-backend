import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout } from "rxjs";
import { BUS_CLIENT } from "@app/shared";

@Injectable()
export class BusService implements OnApplicationBootstrap {
    private readonly timeoutMs: number;
    
    constructor(
        @Inject(BUS_CLIENT) private readonly client: ClientProxy,
        config: ConfigService,
    ) {
        this.timeoutMs = Number(config.get('RPC_TIMEOUT_MS', 10000));
    }

    async onApplicationBootstrap() {
        await this.client.connect()
    }

    send<TResult, TInput = unknown>(pattern: string, data: TInput): Promise<TResult> {
        return firstValueFrom(
            this.client.send<TResult, TInput>(pattern, data)
                .pipe(timeout(this.timeoutMs)),
        );
    }
}