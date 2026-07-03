type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Thiếu biến môi trường bắt buộc: ${missing.join(', ')}`,
    );
  }

  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET phải khác nhau');
  }

  const backendPort = Number(config.BACKEND_PORT ?? 5050);

  if (!Number.isInteger(backendPort)) {
    throw new Error('BACKEND_PORT phải là số nguyên hợp lệ');
  }

  return config;
}
