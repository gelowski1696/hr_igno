import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { catchError, tap, throwError } from 'rxjs';
import { ActivityLogService } from './activity-log.service';

type RequestUser = {
  id?: number;
  username?: string;
  role?: string;
};

type ActivityTrackedRequest = Request & {
  user?: RequestUser;
  id?: string;
  __activityLogged?: boolean;
};

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordhash',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'token',
  'authorization',
  'cookie',
  'jwt',
  'secret',
  'oldpassword',
  'newpassword',
  'confirmpassword',
]);

const DEFAULT_SKIP_PATHS = ['/api/v1/health'];

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly skipPaths = this.resolveSkipPaths();

  constructor(private readonly activityLog: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<ActivityTrackedRequest>();
    const response = http.getResponse<Response>();

    if (!request || !response) {
      return next.handle();
    }

    const requestPath = request.originalUrl || request.url || '';
    if (this.shouldSkipPath(requestPath)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const requestId = this.resolveRequestId(request);
    request.id = requestId;
    response.setHeader('x-request-id', requestId);

    const base = {
      requestId,
      method: request.method || 'UNKNOWN',
      path: requestPath,
      route: this.routeLabel(request),
      controller: context.getClass().name,
      handler: context.getHandler().name,
      ip: this.resolveIp(request),
      userAgent: request.headers['user-agent'] || '',
      actor: this.resolveActor(request.user),
      request: {
        params: sanitize(request.params),
        query: sanitize(request.query),
        body: sanitize(request.body),
      },
    };

    return next.handle().pipe(
      tap((result) => {
        request.__activityLogged = true;
        this.activityLog.log({
          ...base,
          level: 'info',
          statusCode: response.statusCode || 200,
          durationMs: Date.now() - startedAt,
          response: {
            kind: 'success',
            summary: summarizeResult(result),
          },
        });
      }),
      catchError((error: unknown) => {
        request.__activityLogged = true;
        this.activityLog.log({
          ...base,
          level: 'error',
          statusCode: inferStatusCode(error, response.statusCode),
          durationMs: Date.now() - startedAt,
          response: {
            kind: 'error',
          },
          error: serializeError(error),
        });
        return throwError(() => error);
      }),
    );
  }

  private resolveSkipPaths() {
    const configured = process.env.ACTIVITY_LOG_SKIP_PATHS?.trim();
    if (!configured) {
      return DEFAULT_SKIP_PATHS;
    }
    return configured
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private shouldSkipPath(path: string) {
    return this.skipPaths.some((prefix) => path.startsWith(prefix));
  }

  private routeLabel(request: Request) {
    const base = request.baseUrl || '';
    const routePath = request.route?.path || '';
    if (!routePath) return base || request.path || request.url;
    return `${base}${routePath}`;
  }

  private resolveRequestId(request: Request) {
    const headerValue = request.headers['x-request-id'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }
    if (Array.isArray(headerValue) && headerValue[0]) {
      return String(headerValue[0]).trim();
    }
    return randomUUID();
  }

  private resolveIp(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0]?.trim() || request.ip || '';
    }
    return request.ip || '';
  }

  private resolveActor(user: RequestUser | undefined) {
    return {
      id: typeof user?.id === 'number' ? user.id : null,
      username: typeof user?.username === 'string' ? user.username : null,
      role: typeof user?.role === 'string' ? user.role : null,
    };
  }
}

function inferStatusCode(error: unknown, fallback: number) {
  if (typeof error === 'object' && error !== null) {
    const withStatus = error as { status?: unknown };
    if (typeof withStatus.status === 'number') {
      return withStatus.status;
    }

    const withStatusCode = error as { statusCode?: unknown };
    if (typeof withStatusCode.statusCode === 'number') {
      return withStatusCode.statusCode;
    }
  }
  if (fallback && fallback >= 400) {
    return fallback;
  }
  return 500;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
  };
}

function summarizeResult(result: unknown) {
  if (result === null || result === undefined) return null;
  if (typeof result === 'string') return truncate(result);
  if (Array.isArray(result)) return { type: 'array', length: result.length };
  if (typeof result === 'object') {
    const record = result as Record<string, unknown>;
    return {
      type: 'object',
      keys: Object.keys(record).slice(0, 15),
    };
  }
  return result;
}

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return truncate(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitize(item));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(input)) {
      const normalizedKey = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (SENSITIVE_FIELD_NAMES.has(key) || SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = sanitize(fieldValue);
      }
    }
    return output;
  }

  return value;
}

function truncate(value: string, max = 500) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... [truncated ${value.length - max} chars]`;
}
