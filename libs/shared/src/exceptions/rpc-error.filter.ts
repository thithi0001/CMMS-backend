import { ArgumentsHost, Catch, HttpException, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Trong service cứ throw NotFoundException/ConflictException/...;
 * filter đổi thành { statusCode, message } để Gateway map lại sang HTTP.
 */
@Catch()
export class RpcErrorFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(RpcErrorFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    }
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as any).message ?? exception.message);
      return throwError(() => ({ statusCode: exception.getStatus(), message }));
    }
    this.logger.error(exception);
    return throwError(() => ({ statusCode: 500, message: 'Internal server error' }));
  }
}
