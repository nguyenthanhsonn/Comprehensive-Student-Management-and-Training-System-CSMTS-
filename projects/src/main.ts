async function bootstrap() {
  const debugStartup = process.env.DEBUG_STARTUP === 'true';

  if (debugStartup) console.time('startup');
  if (debugStartup) console.time('load-nest');
  const [{ ValidationPipe }, { ConfigService }, { NestFactory }] =
    await Promise.all([
      import('@nestjs/common'),
      import('@nestjs/config'),
      import('@nestjs/core'),
    ]);
  if (debugStartup) console.timeEnd('load-nest');

  if (debugStartup) console.time('load-app-support');
  const [{ HttpExceptionFilter }, { ResponseInterceptor }] = await Promise.all([
    import('./common/filters/http-exception.filter'),
    import('./common/interceptors/response.interceptor'),
  ]);
  if (debugStartup) console.timeEnd('load-app-support');

  if (debugStartup) console.time('load-app-module');
  const { AppModule } = await import('./app.module');
  if (debugStartup) console.timeEnd('load-app-module');

  if (debugStartup) console.time('create-nest-app');
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
  });
  if (debugStartup) console.timeEnd('create-nest-app');

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(configService.get('app.port') ?? 5050);

  console.log('Đang chạy backend...');
  console.log('PORT:', port);

  await app.listen(port, '0.0.0.0');

  console.log(`Backend local: http://localhost:${port}/api/v1`);
  console.log(`Backend ZeroTier: http://10.36.120.48:${port}`);
  if (debugStartup) console.timeEnd('startup');
}

void bootstrap();
