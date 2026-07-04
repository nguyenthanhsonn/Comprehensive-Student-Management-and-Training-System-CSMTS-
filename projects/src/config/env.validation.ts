type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const backendPort = Number(config.BACKEND_PORT ?? 5050);

  if (!Number.isInteger(backendPort)) {
    throw new Error('BACKEND_PORT must be a valid integer');
  }

  return config;
}
