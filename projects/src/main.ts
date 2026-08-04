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
    origin: configService.get<string[]>('app.frontendUrls'),
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

  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    if (debugStartup) console.time('setup-swagger');
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CSMTS API')
      .setDescription(
        'Comprehensive Student Management and Training System API documentation',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Nhập accessToken nhận được từ POST /api/v1/auth/login',
        },
        'access-token',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      ignoreGlobalPrefix: false,
    });

    SwaggerModule.setup('api/docs', app, swaggerDocument, {
      jsonDocumentUrl: 'api/docs-json',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'CSMTS API Docs',
    });
    if (debugStartup) console.timeEnd('setup-swagger');
  }

  const port = Number(configService.get('app.port') ?? 5050);

  console.log('Đang chạy backend...');
  console.log('PORT:', port);

  await app.listen(port, '0.0.0.0');

  const { networkInterfaces } = await import('node:os');
  const zerotierIp = Object.values(networkInterfaces())
    .flat()
    .find((networkInterface) => {
      return (
        networkInterface?.family === 'IPv4' &&
        !networkInterface.internal &&
        networkInterface.address.startsWith('10.36.120.')
      );
    })?.address;

  console.log(`Backend local: http://localhost:${port}/api/v1`);
  if (zerotierIp) {
    console.log(`Backend ZeroTier: http://${zerotierIp}:${port}/api/v1`);
  }
  if (swaggerEnabled) {
    console.log(`Swagger docs: http://localhost:${port}/api/docs`);
    if (zerotierIp) {
      console.log(`Swagger ZeroTier docs: http://${zerotierIp}:${port}/api/docs`);
    }
  }
  if (debugStartup) console.timeEnd('startup');
}

void bootstrap();
