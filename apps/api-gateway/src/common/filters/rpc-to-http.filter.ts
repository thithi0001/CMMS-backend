import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { isRpcErrorPayload } from '@app/shared';
import type { Response } from "express";
import { TimeoutError } from "rxjs";

export interface ApiErrorResponse {
    success: false;
    data: {
        statusCode: number;
        message: unknown;
    },
    meta: {
        timestamp: string;
    };
}

function getHttpExceptionMessage(body: string | object, fallback: string): unknown {
    if (typeof body === 'string') return body;
    if (body !== null && 'message' in body) {
        return (body as { message?: unknown }).message ?? fallback;
    }
    return fallback;
}

@Catch()
export class RpcToHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(RpcToHttpFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>();
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: unknown = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            message = getHttpExceptionMessage(
                exception.getResponse(),
                exception.message,
            );
        } else if (exception instanceof TimeoutError) {
            status = HttpStatus.GATEWAY_TIMEOUT;
            message = 'Service not response (timeout)';
        } else if (isRpcErrorPayload(exception)) {
            status = exception.statusCode;
            message = exception.message;
        } else {
            this.logger.error(exception);
        }

        const response: ApiErrorResponse = {
            success: false,
            data: {
                statusCode: status,
                message,
            },
            meta: {
                timestamp: new Date().toISOString(),
            },
        };

        res.status(status).json(response);
    }
}