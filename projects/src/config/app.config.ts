import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number(process.env.BACKEND_PORT ?? 5050),
  host: process.env.BACKEND_HOST ?? '127.0.0.1',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
