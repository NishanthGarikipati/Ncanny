import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiSuccess } from '@ncanny/types';
import { getRequestId } from './request-context';

/**
 * Wraps every successful handler result in the standard envelope, so controllers
 * return plain domain objects and never construct response shapes themselves.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = getRequestId(request);

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        requestId,
      })),
    );
  }
}
