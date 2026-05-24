import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';
import { ensureDir, getUploadsRoot } from './common/uploads-root';
import { ActivityLogService } from './common/logging/activity-log.service';

type ActivityTrackedRequest = Request & {
  id?: string;
  user?: {
    id?: number;
    username?: string;
    role?: string;
  };
  __activityLogged?: boolean;
};

function parseCorsOrigins(value?: string): string[] {
  return (value || 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const activityLog = app.get(ActivityLogService);
  const uploadsRoot = getUploadsRoot();
  ensureDir(uploadsRoot);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use((request: ActivityTrackedRequest, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const headerValue = request.headers['x-request-id'];
    const requestId =
      (typeof headerValue === 'string' && headerValue.trim()) ||
      (Array.isArray(headerValue) && headerValue[0] ? String(headerValue[0]).trim() : '') ||
      request.id ||
      randomUUID();
    request.id = requestId;
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      if (request.__activityLogged) {
        return;
      }

      const path = request.originalUrl || request.url || '';
      if (path.startsWith('/api/v1/health')) {
        return;
      }

      const forwarded = request.headers['x-forwarded-for'];
      const ip =
        typeof forwarded === 'string' && forwarded.trim()
          ? forwarded.split(',')[0]?.trim() || request.ip || ''
          : request.ip || '';

      activityLog.log({
        level: response.statusCode >= 400 ? 'error' : 'info',
        requestId,
        method: request.method || 'UNKNOWN',
        path,
        route: request.route?.path ? `${request.baseUrl || ''}${request.route.path}` : path,
        controller: 'pre-controller',
        handler: 'pre-controller',
        statusCode: response.statusCode || 500,
        durationMs: Date.now() - startedAt,
        ip,
        userAgent: request.headers['user-agent'] || '',
        actor: {
          id: typeof request.user?.id === 'number' ? request.user.id : null,
          username: typeof request.user?.username === 'string' ? request.user.username : null,
          role: typeof request.user?.role === 'string' ? request.user.role : null,
        },
        request: {
          params: request.params || {},
          query: request.query || {},
          body: null,
        },
        response: {
          kind: response.statusCode >= 400 ? 'error' : 'success',
        },
        error:
          response.statusCode >= 400
            ? {
                name: 'HttpError',
                message: `Request ended with status ${response.statusCode} before controller interceptor logging.`,
              }
            : undefined,
      });
    });

    next();
  });
  app.use('/uploads', express.static(uploadsRoot));
  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ORIGINS),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('VMJAMTECH HR API')
    .setDescription('NestJS API for the VMJAMTECH HR reconstruction')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
}

void bootstrap();
