import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
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

const isRpcError = (e: unknown): e is { statusCode: number; message: unknown } => 
    typeof e === 'object' && e !== null && 
    typeof (e as any).statusCode === 'number';

@Catch()
export class RpcToHttpFilter implements ExceptionFilter {
    private readonly logger = new Logger(RpcToHttpFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>();
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: unknown = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            message = typeof body === 'string' ? body 
                : ((body as any).message ?? exception.message);
        } else if (exception instanceof TimeoutError) {
            status = HttpStatus.GATEWAY_TIMEOUT;
            message = 'Service not response (timeout)';
        } else if (isRpcError(exception)) {
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