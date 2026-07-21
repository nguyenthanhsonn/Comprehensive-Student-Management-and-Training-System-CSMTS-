import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { ApiResponse } from 'src/common/shared';
import { map, type Observable } from 'rxjs';

type HttpRequest = {
  method: string;
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
        message: resolveSuccessMessage(response.statusCode, request.method),
        data: data ?? null,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}

function resolveSuccessMessage(statusCode: number, method: string): string {
  if (statusCode === 201) {
    return 'Tạo mới thành công';
  }

  if (statusCode === 204) {
    return 'Thao tác thành công';
  }

  if (method === 'POST') {
    return 'Gửi yêu cầu thành công';
  }

  if (method === 'PATCH' || method === 'PUT') {
    return 'Cập nhật thành công';
  }

  if (method === 'DELETE') {
    return 'Xóa thành công';
  }

  return 'Thao tác thành công';
}
