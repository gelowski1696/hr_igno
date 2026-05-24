import { Injectable, Logger } from '@nestjs/common';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { getUploadsRoot } from '../uploads-root';

type ActivityLogLevel = 'info' | 'error';

export type ActivityLogEntry = {
  level: ActivityLogLevel;
  requestId: string;
  method: string;
  path: string;
  route: string;
  controller: string;
  handler: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  actor: {
    id: number | null;
    username: string | null;
    role: string | null;
  };
  request: {
    params: unknown;
    query: unknown;
    body: unknown;
  };
  response: {
    kind: 'success' | 'error';
    summary?: unknown;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly logPath = this.resolveLogPath();
  private writeChain: Promise<void> = Promise.resolve();
  private directoryReady = false;

  getLogPath() {
    return this.logPath;
  }

  log(entry: ActivityLogEntry) {
    const line = `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;
    this.writeChain = this.writeChain
      .then(async () => {
        await this.ensureDirectory();
        await appendFile(this.logPath, line, 'utf8');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed writing activity log (${this.logPath}): ${message}`);
      });
  }

  private resolveLogPath() {
    const configured = process.env.ACTIVITY_LOG_PATH?.trim();
    if (configured) {
      return resolve(configured);
    }
    return join(getUploadsRoot(), 'logs', 'activity.log');
  }

  private async ensureDirectory() {
    if (this.directoryReady) {
      return;
    }
    await mkdir(dirname(this.logPath), { recursive: true });
    this.directoryReady = true;
    this.logger.log(`Activity logging enabled at ${this.logPath}`);
  }
}
