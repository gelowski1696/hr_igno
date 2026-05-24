import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleTemplateDto } from './dto/create-schedule-template.dto';
import { UpdateScheduleTemplateDto } from './dto/update-schedule-template.dto';

@Injectable()
export class ScheduleTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  private computeDurationHours(start?: Date | null, end?: Date | null) {
    if (!start || !end) return null;
    const startMs = start.getTime();
    let endMs = end.getTime();
    if (endMs <= startMs) {
      endMs += 24 * 60 * 60 * 1000;
    }
    const hours = (endMs - startMs) / (60 * 60 * 1000);
    return Number(hours.toFixed(2));
  }

  private parseLegacyEmployeeIds(value?: string | null) {
    if (!value) return [];
    const tokens = value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);

    if (!tokens.length) return [];

    const ids: number[] = [];
    for (const token of tokens) {
      if (!/^\d+$/.test(token)) {
        throw new BadRequestException('legacyEmployeeIds must contain numeric employee IDs separated by commas.');
      }
      const parsed = Number(token);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException('legacyEmployeeIds must contain valid positive employee IDs.');
      }
      ids.push(parsed);
    }

    return Array.from(new Set(ids));
  }

  private normalizeLegacyEmployeeIds(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ids = this.parseLegacyEmployeeIds(trimmed);
    return ids.length ? ids.join(',') : null;
  }

  private mapTemplateWithAssignments(
    template: {
      id: number;
      name: string;
      description: string | null;
      workDay: string | null;
      startTime: Date;
      endTime: Date;
      breakStart: Date | null;
      breakEnd: Date | null;
      duration: unknown;
      breakDuration: unknown;
      legacyEmployeeIds: string | null;
      createdAt: Date;
      updatedAt: Date;
      employees?: Array<{ employeeId: number }>;
    },
  ) {
    const assignedIds = new Set<number>(this.parseLegacyEmployeeIds(template.legacyEmployeeIds));
    for (const assignment of template.employees || []) {
      if (Number.isInteger(assignment.employeeId) && assignment.employeeId > 0) {
        assignedIds.add(assignment.employeeId);
      }
    }

    const normalizedAssignedIds = Array.from(assignedIds).sort((a, b) => a - b);
    return {
      ...template,
      assignedEmployeeCount: normalizedAssignedIds.length,
      assignedEmployeeIds: normalizedAssignedIds,
      assignedEmployeeIdsCsv: normalizedAssignedIds.join(','),
    };
  }

  private normalizeClockToDateTime(value?: string, fieldLabel = 'time') {
    if (value === undefined || value === null) return undefined;
    const normalized = value.trim();
    if (!normalized) return undefined;

    const clockMatch = /^(\d{2}):(\d{2})$/.exec(normalized);
    if (clockMatch) {
      const hours = Number(clockMatch[1]);
      const minutes = Number(clockMatch[2]);
      if (hours > 23 || minutes > 59) {
        throw new BadRequestException(`${fieldLabel} must be a valid HH:mm value.`);
      }
      return new Date(`1970-01-01T${clockMatch[1]}:${clockMatch[2]}:00+08:00`);
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldLabel} must be a valid HH:mm value.`);
    }
    return parsed;
  }

  create(dto: CreateScheduleTemplateDto) {
    const startTime = this.normalizeClockToDateTime(dto.startTime, 'startTime');
    const endTime = this.normalizeClockToDateTime(dto.endTime, 'endTime');

    if (!startTime || !endTime) {
      throw new BadRequestException('Start time and end time are required and must be valid HH:mm values.');
    }

    const breakStart = this.normalizeClockToDateTime(dto.breakStart, 'breakStart');
    const breakEnd = this.normalizeClockToDateTime(dto.breakEnd, 'breakEnd');
    const computedDuration = this.computeDurationHours(startTime, endTime);
    const computedBreakDuration = this.computeDurationHours(breakStart, breakEnd);

    return this.prisma.scheduleTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        workDay: dto.workDay,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        duration: computedDuration,
        breakDuration: computedBreakDuration,
        legacyEmployeeIds: this.normalizeLegacyEmployeeIds(dto.legacyEmployeeIds),
      },
    });
  }

  async findAll() {
    const templates = await this.prisma.scheduleTemplate.findMany({
      orderBy: { name: 'asc' },
      include: {
        employees: {
          select: {
            employeeId: true,
          },
        },
      },
    });

    return templates.map((template) => this.mapTemplateWithAssignments(template));
  }

  async findOne(id: number) {
    const record = await this.prisma.scheduleTemplate.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            employeeId: true,
          },
        },
      },
    });
    if (!record) throw new NotFoundException('Schedule template not found');
    return this.mapTemplateWithAssignments(record);
  }

  async update(id: number, dto: UpdateScheduleTemplateDto) {
    const existing = await this.prisma.scheduleTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Schedule template not found');
    }

    const startTime =
      dto.startTime === undefined
        ? undefined
        : this.normalizeClockToDateTime(dto.startTime, 'startTime');
    const endTime =
      dto.endTime === undefined
        ? undefined
        : this.normalizeClockToDateTime(dto.endTime, 'endTime');
    const breakStart =
      dto.breakStart === undefined
        ? undefined
        : dto.breakStart.trim() === ''
          ? null
          : this.normalizeClockToDateTime(dto.breakStart, 'breakStart');
    const breakEnd =
      dto.breakEnd === undefined
        ? undefined
        : dto.breakEnd.trim() === ''
          ? null
          : this.normalizeClockToDateTime(dto.breakEnd, 'breakEnd');

    const nextStartTime = startTime ?? existing.startTime;
    const nextEndTime = endTime ?? existing.endTime;
    const nextBreakStart = breakStart === undefined ? existing.breakStart : breakStart;
    const nextBreakEnd = breakEnd === undefined ? existing.breakEnd : breakEnd;
    const computedDuration = this.computeDurationHours(nextStartTime, nextEndTime);
    const computedBreakDuration = this.computeDurationHours(nextBreakStart, nextBreakEnd);

    return this.prisma.scheduleTemplate.update({
      where: { id },
      data: {
        name: dto.name === '' ? undefined : dto.name,
        description: dto.description === undefined ? undefined : dto.description || null,
        workDay: dto.workDay === undefined ? undefined : dto.workDay || null,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        duration: computedDuration,
        breakDuration: computedBreakDuration,
        legacyEmployeeIds: this.normalizeLegacyEmployeeIds(dto.legacyEmployeeIds),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.scheduleTemplate.delete({ where: { id } });
    return { success: true };
  }
}
