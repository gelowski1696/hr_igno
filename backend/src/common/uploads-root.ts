import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DEFAULT_UPLOADS_ROOT = join(process.cwd(), 'uploads');

export function getUploadsRoot() {
  const configured = process.env.UPLOAD_ROOT?.trim();
  return configured ? resolve(configured) : DEFAULT_UPLOADS_ROOT;
}

export function getUploadsSubdir(subdir: string) {
  return join(getUploadsRoot(), subdir);
}

export function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}
