import { z } from 'zod';

export type LoginInput = {
  email: string;
  password: string;
};

export const loginSchema: z.ZodType<LoginInput> = z.object({
  email: z.email(),
  password: z.string().min(8),
});
