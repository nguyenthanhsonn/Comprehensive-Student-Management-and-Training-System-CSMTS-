import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response_message';

/** Đặt message tiếng Việt tùy chỉnh cho response thành công của 1 endpoint (đọc bởi ResponseInterceptor). */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
