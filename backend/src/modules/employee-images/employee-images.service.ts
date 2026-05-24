import { Injectable, NotFoundException } from '@nestjs/common';
import type { EmployeeImage } from '@prisma/client';
import { basename } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildUploadedEmployeeImagePath,
  type EmployeeImageFieldName,
} from './employee-images-upload';

type UploadFiles = Partial<Record<EmployeeImageFieldName, Express.Multer.File[]>>;

@Injectable()
export class EmployeeImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployeeId(employeeId: number) {
    await this.assertEmployeeExists(employeeId);

    const record = await this.prisma.employeeImage.findUnique({
      where: { employeeId },
    });

    if (!record) {
      return null;
    }

    return this.toLegacyShape(record);
  }

  async upsert(employeeId: number, files: UploadFiles) {
    await this.assertEmployeeExists(employeeId);

    const updateData = this.mapUploadFilesToData(files);
    if (!Object.keys(updateData).length) {
      const existing = await this.prisma.employeeImage.findUnique({
        where: { employeeId },
      });
      return existing ? this.toLegacyShape(existing) : null;
    }

    const saved = await this.prisma.employeeImage.upsert({
      where: { employeeId },
      create: {
        employeeId,
        ...updateData,
      },
      update: updateData,
    });

    return this.toLegacyShape(saved);
  }

  async remove(employeeId: number) {
    await this.assertEmployeeExists(employeeId);

    await this.prisma.employeeImage.deleteMany({
      where: { employeeId },
    });

    return { success: true };
  }

  private async assertEmployeeExists(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
  }

  private mapUploadFilesToData(files: UploadFiles) {
    const validId1 = buildUploadedEmployeeImagePath(files.valid_id_1?.[0]);
    const validId2 = buildUploadedEmployeeImagePath(files.valid_id_2?.[0]);
    const mugshot1 = buildUploadedEmployeeImagePath(files.mugshot_1?.[0]);
    const mugshot2 = buildUploadedEmployeeImagePath(files.mugshot_2?.[0]);
    const mugshot3 = buildUploadedEmployeeImagePath(files.mugshot_3?.[0]);
    const mugshot4 = buildUploadedEmployeeImagePath(files.mugshot_4?.[0]);

    const data: Partial<EmployeeImage> = {};
    if (validId1) data.validId1 = validId1;
    if (validId2) data.validId2 = validId2;
    if (mugshot1) data.mugshot1 = mugshot1;
    if (mugshot2) data.mugshot2 = mugshot2;
    if (mugshot3) data.mugshot3 = mugshot3;
    if (mugshot4) data.mugshot4 = mugshot4;
    return data;
  }

  private toLegacyShape(record: EmployeeImage) {
    return {
      id: record.id,
      employee_id: record.employeeId,
      employeeId: record.employeeId,
      valid_id_1: normalizeImagePath(record.validId1),
      valid_id_2: normalizeImagePath(record.validId2),
      mugshot_1: normalizeImagePath(record.mugshot1),
      mugshot_2: normalizeImagePath(record.mugshot2),
      mugshot_3: normalizeImagePath(record.mugshot3),
      mugshot_4: normalizeImagePath(record.mugshot4),
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }
}

function normalizeImagePath(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('/uploads/')) return path;
  if (path.startsWith('/employeeImages/')) {
    return `/uploads/employee-images/${basename(path)}`;
  }
  if (path.startsWith('employeeImages/')) {
    return `/uploads/employee-images/${basename(path)}`;
  }
  return path;
}
