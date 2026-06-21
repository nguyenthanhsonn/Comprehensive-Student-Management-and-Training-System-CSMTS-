import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number(process.env.BACKEND_PORT ?? 3001),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
}));
