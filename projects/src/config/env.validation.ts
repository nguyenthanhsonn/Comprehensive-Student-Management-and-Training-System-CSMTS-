type Environment = Record<string, unknown>;

export function validateEnvironment(config: Environment): Environment {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const backendPort = Number(config.BACKEND_PORT ?? 3001);

  if (!Number.isInteger(backendPort)) {
    throw new Error('BACKEND_PORT must be a valid integer');
  }

  return config;
}
