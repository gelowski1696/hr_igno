import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { ensureDir, getUploadsSubdir } from '../../common/uploads-root';

export function employeeImagesUploadDir() {
  return getUploadsSubdir('employee-images');
}

export const employeeImageFieldNames = [
  'valid_id_1',
  'valid_id_2',
  'mugshot_1',
  'mugshot_2',
  'mugshot_3',
  'mugshot_4',
] as const;

export type EmployeeImageFieldName = (typeof employeeImageFieldNames)[number];

function ensureUploadDir() {
  ensureDir(employeeImagesUploadDir());
}

function safeSegment(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export const employeeImagesUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_request, _file, callback) => {
      ensureUploadDir();
      callback(null, employeeImagesUploadDir());
    },
    filename: (request, file, callback) => {
      const rawEmployeeId = request.params?.employeeId || request.body?.employee_id || request.body?.employeeId || 'employee';
      const employeeId = safeSegment(String(rawEmployeeId || 'employee')) || 'employee';
      const field = safeSegment(String(file.fieldname || 'image')) || 'image';
      const extension = extname(file.originalname) || '.jpg';
      callback(null, `${employeeId}-${field}-${Date.now()}${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new BadRequestException('Only image uploads are allowed'), false);
      return;
    }
    callback(null, true);
  },
};

export function buildUploadedEmployeeImagePath(file?: Express.Multer.File) {
  return file ? `/uploads/employee-images/${file.filename}` : undefined;
}
