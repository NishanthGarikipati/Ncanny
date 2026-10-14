import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLogger } from './common/logging/app-logger.service';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const config = new AppConfigService();
  AppLogger.configure(config.logLevel);

  const logger = new AppLogger().setContext('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger, bufferLogs: false, bodyParser: false });
  // Paintings and elocution recordings travel as base64 JSON, which exceeds
  // Express's default 100kb limit. The Zod schema still rejects oversized files.
  app.use(json({ limit: '8mb' }));
  app.use(urlencoded({ extended: true, limit: '8mb' }));

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  app.setGlobalPrefix(`${config.globalPrefix}/v1`);
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Ncanny API')
        .setDescription(
          'Academic social network and gamified learning platform. Every response uses the standard envelope: ' +
            '`{ success, data, requestId }` or `{ success: false, error: { code, message, details? }, requestId }`.',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${config.globalPrefix}/docs`, app, document);
  }

  await app.listen(config.port);

  logger.log('Ncanny API started', {
    port: config.port,
    environment: config.nodeEnv,
    docs: config.swaggerEnabled ? `/${config.globalPrefix}/docs` : 'disabled',
  });
}

void bootstrap();
