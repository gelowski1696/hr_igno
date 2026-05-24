import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type StoredFile } from '@prisma/client';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { getUploadsRoot } from '../../common/uploads-root';
import { PrismaService } from '../prisma/prisma.service';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { buildUploadedFilePath } from './files-upload';

type UploadMeta = {
  module?: string;
  ownerType?: string;
  ownerId?: number | string;
};

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListFilesQueryDto) {
    const take = Math.min(Math.max(query.take ?? 25, 1), 200);
    const skip = Math.max(query.skip ?? 0, 0);
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.storedFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.storedFile.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toResponse(row)),
      total,
      take,
      skip,
    };
  }

  async upload(files: Express.Multer.File[], meta: UploadMeta, uploadedById?: number | null) {
    const normalizedFiles = files.filter(Boolean);
    if (!normalizedFiles.length) {
      return { created: [] };
    }

    const moduleName = this.normalizeModule(meta.module);
    const ownerType = this.normalizeOwnerType(meta.ownerType);
    const ownerId = this.parseOwnerId(meta.ownerId);

    const created = await this.prisma.$transaction(
      normalizedFiles.map((file) =>
        this.prisma.storedFile.create({
          data: {
            module: moduleName,
            ownerType,
            ownerId,
            originalName: file.originalname,
            storedName: file.filename,
            relativePath: buildUploadedFilePath(file),
            mimeType: file.mimetype || 'application/octet-stream',
            sizeBytes: BigInt(file.size),
            uploadedById: uploadedById ?? null,
          },
        }),
      ),
    );

    return {
      created: created.map((row) => this.toResponse(row)),
    };
  }

  async remove(id: number) {
    const record = await this.prisma.storedFile.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException('File not found');
    }

    await this.prisma.storedFile.delete({ where: { id } });
    this.tryDeletePhysicalFile(record.relativePath);
    return { success: true };
  }

  private buildWhere(query: ListFilesQueryDto): Prisma.StoredFileWhereInput {
    const where: Prisma.StoredFileWhereInput = {};

    if (query.module?.trim()) {
      where.module = query.module.trim();
    }
    if (query.ownerType?.trim()) {
      where.ownerType = query.ownerType.trim();
    }
    if (query.ownerId) {
      where.ownerId = query.ownerId;
    }

    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { module: { contains: search, mode: 'insensitive' } },
        { mimeType: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private toResponse(row: StoredFile) {
    return {
      id: row.id,
      module: row.module,
      ownerType: row.ownerType,
      ownerId: row.ownerId,
      originalName: row.originalName,
      storedName: row.storedName,
      relativePath: row.relativePath,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes),
      uploadedById: row.uploadedById,
      createdAt: row.createdAt,
    };
  }

  private normalizeModule(value?: string) {
    const moduleValue = value?.trim();
    return moduleValue && moduleValue.length > 0 ? moduleValue.slice(0, 80) : 'general';
  }

  private normalizeOwnerType(value?: string) {
    const ownerType = value?.trim();
    if (!ownerType) return null;
    return ownerType.slice(0, 80);
  }

  private parseOwnerId(value?: number | string) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  private tryDeletePhysicalFile(relativePath: string) {
    const normalizedRelative = relativePath.replace(/^\/+/, '');
    if (!normalizedRelative.startsWith('uploads/')) {
      return;
    }

    const uploadsRoot = resolve(getUploadsRoot());
    const relativeInsideUploads = normalizedRelative.slice('uploads/'.length);
    const absolute = resolve(uploadsRoot, relativeInsideUploads);

    if (!absolute.startsWith(uploadsRoot)) {
      return;
    }

    if (existsSync(absolute)) {
      unlinkSync(absolute);
    }
  }
}
