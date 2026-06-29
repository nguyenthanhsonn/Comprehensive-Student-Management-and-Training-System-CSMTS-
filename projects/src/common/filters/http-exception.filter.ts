import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ApiErrorDetail, ApiErrorResponse } from 'src/common/shared';

type ExceptionResponseBody = {
  message?: string | string[];
  error?: string;
  errors?: ApiErrorDetail[] | string[] | Record<string, string | string[]>;
};

type HttpRequest = {
  url: string;
};

type HttpResponse = {
  status(statusCode: number): {
    json(payload: ApiErrorResponse): void;
  };
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body = normalizeExceptionResponse(exceptionResponse);
    const validationErrors = getValidationErrors(exception, body);
    const message = resolveErrorMessage(body, status, validationErrors);

    const payload: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      data: null,
      ...(validationErrors.length > 0 ? { errors: validationErrors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }
}

function normalizeExceptionResponse(
  response: string | object | null,
): ExceptionResponseBody {
  if (typeof response === 'string') {
    return { message: response };
  }

  if (response && typeof response === 'object') {
    return response;
  }

  return {};
}

function resolveErrorMessage(
  body: ExceptionResponseBody,
  status: number,
  validationErrors: ApiErrorDetail[],
): string {
  if (validationErrors.length > 0) {
    return 'Validation failed';
  }

  if (typeof body.message === 'string') {
    return body.message;
  }

  if (Array.isArray(body.message) && body.message.length > 0) {
    return body.message[0] ?? 'Request failed';
  }

  if (typeof body.error === 'string') {
    return body.error;
  }

  return status === 500 ? 'Internal server error' : 'Request failed';
}

function getValidationErrors(
  exception: unknown,
  body: ExceptionResponseBody,
): ApiErrorDetail[] {
  if (!(exception instanceof BadRequestException)) {
    return normalizeErrors(body.errors);
  }

  const errors = normalizeErrors(body.errors);
  if (errors.length > 0) {
    return errors;
  }

  if (!Array.isArray(body.message)) {
    return [];
  }

  return body.message.map((error) => ({
    field: extractFieldName(error),
    error,
  }));
}

function normalizeErrors(
  errors: ExceptionResponseBody['errors'],
): ApiErrorDetail[] {
  if (!errors) {
    return [];
  }

  if (Array.isArray(errors)) {
    return errors.map((error) =>
      typeof error === 'string' ? { error } : error,
    );
  }

  return Object.entries(errors).flatMap(([field, value]) => {
    const messages = Array.isArray(value) ? value : [value];
    return messages.map((error) => ({ field, error }));
  });
}

function extractFieldName(error: string): string | undefined {
  const [field] = error.split(' ');
  return field || undefined;
}
