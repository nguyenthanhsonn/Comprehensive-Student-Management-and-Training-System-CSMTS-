import { z } from 'zod';

export type LoginInput = {
  username: string;
  password: string;
};

export const loginSchema: z.ZodType<LoginInput> = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(50)
    .regex(
      /^[a-z0-9._-]+$/,
      'Tên đăng nhập chỉ được chứa chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang',
    ),
  password: z.string().min(8),
});
