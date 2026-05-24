import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ensureDir, getUploadsSubdir } from '../../common/uploads-root';

export function remoteClockUploadDir() {
  return getUploadsSubdir('employee-time-record');
}

function ensureUploadDir() {
  ensureDir(remoteClockUploadDir());
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

export const remoteClockUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      ensureUploadDir();
      callback(null, remoteClockUploadDir());
    },
    filename: (request, file, callback) => {
      const employeeId = safeSegment(String(request.body.employeeId || 'employee'));
      const extension = extname(file.originalname) || '.png';
      callback(null, `${employeeId}_${Date.now()}${extension}`);
    },
  }),
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new BadRequestException('Only image uploads are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

export function uploadedRemoteClockPath(file?: Express.Multer.File) {
  return file ? `/uploads/employee-time-record/${file.filename}` : undefined;
}
