import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { ApiResponse } from '@smaste/shared';
import { map, type Observable } from 'rxjs';

type HttpRequest = {
  url: string;
};

type HttpResponse = {
  statusCode: number;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T | null>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T | null>> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message: resolveSuccessMessage(response.statusCode),
        data: data ?? null,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}

function resolveSuccessMessage(statusCode: number): string {
  if (statusCode === 201) {
    return 'Created successfully';
  }

  if (statusCode === 204) {
    return 'No content';
  }

  return 'Request completed successfully';
}
