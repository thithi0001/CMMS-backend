import {
	GatewayTimeoutException,
	HttpException,
	ServiceUnavailableException,
} from '@nestjs/common';
import type { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';

export interface RpcErrorPayload {
	statusCode: number;
	message: unknown;
}

export function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
	if (typeof value !== 'object' || value === null) return false;

	const payload = value as { statusCode?: unknown; message?: unknown };
	return typeof payload.statusCode === 'number'
		&& Number.isInteger(payload.statusCode)
		&& payload.statusCode >= 400
		&& payload.statusCode <= 599
		&& Object.prototype.hasOwnProperty.call(value, 'message');
}

export async function sendRpcRequest<TResponse, TRequest>(
	client: ClientProxy,
	pattern: string,
	data: TRequest,
	timeoutMs: number,
): Promise<TResponse> {
	try {
		return await firstValueFrom(
			client.send<TResponse, TRequest>(pattern, data).pipe(timeout(timeoutMs)),
		);
	} catch (error) {
		if (error instanceof TimeoutError) {
			throw new GatewayTimeoutException('RPC request timed out');
		}

		if (isRpcErrorPayload(error)) {
			throw new HttpException(
				{ statusCode: error.statusCode, message: error.message },
				error.statusCode,
			);
		}

		throw new ServiceUnavailableException('RPC request failed', { cause: error });
	}
}
