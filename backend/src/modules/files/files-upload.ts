import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ensureDir, getUploadsSubdir } from '../../common/uploads-root';

export function filesUploadDir() {
  return getUploadsSubdir('files');
}

function ensureUploadDir() {
  ensureDir(filesUploadDir());
}

function safeSegment(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export const filesUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      ensureUploadDir();
      callback(null, filesUploadDir());
    },
    filename: (request, file, callback) => {
      const moduleName = safeSegment(String(request.body.module || 'general').toLowerCase()) || 'general';
      const extension = extname(file.originalname) || '';
      const stamp = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      callback(null, `${moduleName}_${stamp}${extension}`);
    },
  }),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_request, file, callback) => {
    const lowered = file.originalname.toLowerCase();
    if (lowered.endsWith('.exe') || lowered.endsWith('.bat') || lowered.endsWith('.cmd')) {
      callback(new BadRequestException('Executable file uploads are not allowed.'), false);
      return;
    }
    callback(null, true);
  },
};

export function buildUploadedFilePath(file: Express.Multer.File) {
  return `/uploads/files/${file.filename}`;
}
