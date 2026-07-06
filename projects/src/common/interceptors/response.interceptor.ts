import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiResponse } from 'src/common/shared';
import { map, type Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import type { PaginatedResult } from '../types/pagination-result.type';

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
  // Reflector không có dependency nào nên tự khởi tạo trực tiếp,
  // tránh phải đổi cách main.ts đang `new ResponseInterceptor()` thủ công.
  private readonly reflector = new Reflector();

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T | null>> {
    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const customMessage = this.reflector.get<string | undefined>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((payload) => {
        if (isPaginatedResult(payload)) {
          return {
            success: true as const,
            statusCode: response.statusCode,
            message: customMessage ?? resolveSuccessMessage(response.statusCode),
            data: payload.items as T,
            meta: payload.meta,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        return {
          success: true as const,
          statusCode: response.statusCode,
          message: customMessage ?? resolveSuccessMessage(response.statusCode),
          data: (payload ?? null) as T | null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}

/**
 * Nhận diện response có phải kết quả phân trang (`{ items, meta }`) hay không.
 * Nếu đúng, ResponseInterceptor sẽ tách `meta` ra ngoài cùng cấp với `data`.
 */
function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PaginatedResult<unknown>>;
  return Array.isArray(candidate.items) && typeof candidate.meta === 'object';
}

function resolveSuccessMessage(statusCode: number): string {
  if (statusCode === 201) {
    return 'Tạo mới thành công';
  }

  if (statusCode === 204) {
    return 'Không có nội dung';
  }

  return 'Yêu cầu được xử lý thành công';
}
