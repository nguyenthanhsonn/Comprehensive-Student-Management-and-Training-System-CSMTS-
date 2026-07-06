export type ApiErrorDetail = {
  field?: string;
  error: string;
};

export type ApiPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiSuccessResponse<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiPaginationMeta;
  timestamp: string;
  path: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string;
  data: null;
  errors?: ApiErrorDetail[];
  timestamp: string;
  path: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
