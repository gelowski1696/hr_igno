import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RecurrenceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ListSchedulesQueryDto } from './dto/list-schedules-query.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

type CandidateSchedule = {
  dateKey: string;
  workDay: string;
  shiftName: string;
  startTime: Date;
  endTime: Date;
  breakStart?: Date | null;
  breakEnd?: Date | null;
  duration?: number;
  breakDuration?: number;
  status: string;
  notes?: string;
  recurrenceType: RecurrenceType;
  recurrenceDays?: string;
};

type ConflictWarning = {
  employeeId: number;
  date: string;
  type: 'DUPLICATE' | 'OVERLAP' | 'MISSING_REST_DAY' | 'MISSING_EMPLOYEE';
  message: string;
};

type CompactScheduleRow = {
  id: string;
  compact: true;
  shiftName: string;
  status: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  workDays: string[];
  startClock: string;
  endClock: string;
  rangeStart: string;
  rangeEnd: string;
  occurrences: number;
  employeeAssignments: number;
  notes: string | null;
};

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly manilaWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
  });

  private readonly manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  private readonly manilaClockFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  private resolveClockFromDate(value: Date | null | undefined) {
    if (!value) return undefined;
    const parts = this.manilaClockFormatter.formatToParts(value);
    const hour = parts.find((part) => part.type === 'hour')?.value;
    const minute = parts.find((part) => part.type === 'minute')?.value;
    if (!hour || !minute) return undefined;
    return `${hour}:${minute}`;
  }

  private resolveDayKey(date: Date) {
    const parts = this.manilaDateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) {
      throw new BadRequestException('Unable to resolve schedule date.');
    }
    return `${year}-${month}-${day}`;
  }

  private normalizeWeekdayLabel(value: string) {
    const normalized = value.trim().toLowerCase();
    const map: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };

    return map[normalized] || null;
  }

  private combineDateAndClock(dateKey: string, clock: string) {
    const clockValue = clock.trim();
    if (!/^\d{2}:\d{2}$/.test(clockValue)) {
      throw new BadRequestException(`Invalid clock format "${clock}". Use HH:mm.`);
    }

    const candidate = new Date(`${dateKey}T${clockValue}:00+08:00`);
    if (Number.isNaN(candidate.getTime())) {
      throw new BadRequestException(`Invalid date or clock combination (${dateKey} ${clock}).`);
    }
    return candidate;
  }

  private parseDateKey(value: string) {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`Invalid date "${value}". Use YYYY-MM-DD.`);
    }
    const date = new Date(`${trimmed}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date "${value}".`);
    }
    return { date, key: trimmed };
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    if (typeof value === 'object' && value && 'toString' in value) {
      const parsed = Number((value as { toString: () => string }).toString());
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }

  private normalizeCompactWorkDay(value: string | null | undefined, startTime: Date) {
    const fallback = this.manilaWeekdayFormatter.format(startTime);
    if (!value) return fallback;

    const trimmed = value.trim();
    if (!trimmed) return fallback;

    const normalized = this.normalizeWeekdayLabel(trimmed);
    if (normalized) return normalized;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}T00:00:00+08:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return this.manilaWeekdayFormatter.format(parsed);
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return this.manilaWeekdayFormatter.format(parsed);
    }

    return fallback;
  }

  private parsePagination(query: ListSchedulesQueryDto) {
    const take = Math.min(Math.max(query.take ?? 200, 1), 1000);
    const skip = Math.max(query.skip ?? 0, 0);
    return { take, skip };
  }

  private buildListWhere(query: ListSchedulesQueryDto) {
    const where: Record<string, unknown> = {};
    const range: Record<string, Date> = {};

    if (query.from) {
      range.gte = this.parseDateKey(query.from).date;
    }

    if (query.to) {
      range.lte = this.combineDateAndClock(this.parseDateKey(query.to).key, '23:59');
    }

    if (Object.keys(range).length) {
      where.startTime = range;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { shiftName: { contains: search, mode: 'insensitive' } },
        { workDay: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { recurrenceDays: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private weekdayOrder(label: string) {
    const list = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const index = list.indexOf(label);
    return index === -1 ? 99 : index;
  }

  private enumerateDateKeys(
    dateFrom: string,
    dateTo: string,
    recurrenceType: RecurrenceType,
    recurrenceDays?: string[],
  ) {
    const from = this.parseDateKey(dateFrom);
    const to = this.parseDateKey(dateTo);

    if (to.date < from.date) {
      throw new BadRequestException('dateTo must be on or after dateFrom.');
    }

    if (recurrenceType === RecurrenceType.NONE) {
      return [from.key];
    }

    const normalizedDays = (recurrenceDays || [])
      .map((day) => this.normalizeWeekdayLabel(day))
      .filter((day): day is string => Boolean(day));

    const defaultDay = this.manilaWeekdayFormatter.format(from.date);
    const selectedDays =
      normalizedDays.length > 0
        ? new Set(normalizedDays)
        : recurrenceType === RecurrenceType.DAILY
          ? null
          : new Set([defaultDay]);

    const keys: string[] = [];
    const cursor = new Date(from.date);
    while (cursor <= to.date) {
      const weekday = this.manilaWeekdayFormatter.format(cursor);
      if (!selectedDays || selectedDays.has(weekday)) {
        keys.push(this.resolveDayKey(cursor));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return keys;
  }

  private async resolveBulkBase(dto: BulkScheduleDto) {
    const template = dto.templateId
      ? await this.prisma.scheduleTemplate.findUnique({ where: { id: dto.templateId } })
      : null;

    if (dto.templateId && !template) {
      throw new NotFoundException('Schedule template not found.');
    }

    const startClock = dto.startClock || this.resolveClockFromDate(template?.startTime ?? null);
    const endClock = dto.endClock || this.resolveClockFromDate(template?.endTime ?? null);
    const breakStartClock =
      dto.breakStartClock !== undefined
        ? dto.breakStartClock
        : this.resolveClockFromDate(template?.breakStart ?? null);
    const breakEndClock =
      dto.breakEndClock !== undefined
        ? dto.breakEndClock
        : this.resolveClockFromDate(template?.breakEnd ?? null);

    if (!startClock || !endClock) {
      throw new BadRequestException('Start and end clock values are required (HH:mm).');
    }

    return {
      shiftName: dto.shiftName || template?.name || 'Shift',
      startClock,
      endClock,
      breakStartClock: breakStartClock || undefined,
      breakEndClock: breakEndClock || undefined,
      duration: dto.duration ?? this.toNumber(template?.duration),
      breakDuration: dto.breakDuration ?? this.toNumber(template?.breakDuration),
      status: dto.status || 'ACTIVE',
      notes: dto.notes || template?.description || undefined,
      recurrenceType: dto.recurrenceType ?? RecurrenceType.WEEKLY,
      recurrenceDays: dto.recurrenceDays,
    };
  }

  private buildCandidates(dateKeys: string[], base: Awaited<ReturnType<SchedulesService['resolveBulkBase']>>) {
    return dateKeys.map<CandidateSchedule>((dateKey) => {
      const startTime = this.combineDateAndClock(dateKey, base.startClock);
      let endTime = this.combineDateAndClock(dateKey, base.endClock);
      if (endTime <= startTime) {
        endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      }

      const breakStart = base.breakStartClock ? this.combineDateAndClock(dateKey, base.breakStartClock) : null;
      let breakEnd = base.breakEndClock ? this.combineDateAndClock(dateKey, base.breakEndClock) : null;
      if (breakStart && breakEnd && breakEnd <= breakStart) {
        breakEnd = new Date(breakEnd.getTime() + 24 * 60 * 60 * 1000);
      }

      const weekday = this.manilaWeekdayFormatter.format(startTime);
      return {
        dateKey,
        workDay: weekday,
        shiftName: base.shiftName,
        startTime,
        endTime,
        breakStart,
        breakEnd,
        duration: base.duration,
        breakDuration: base.breakDuration,
        status: base.status,
        notes: base.notes,
        recurrenceType: base.recurrenceType,
        recurrenceDays: base.recurrenceDays?.join(','),
      };
    });
  }

  async create(dto: CreateScheduleDto) {
    const schedule = await this.prisma.workSchedule.create({
      data: {
        shiftName: dto.shiftName,
        workDay: dto.workDay,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        breakStart: dto.breakStart ? new Date(dto.breakStart) : undefined,
        breakEnd: dto.breakEnd ? new Date(dto.breakEnd) : undefined,
        duration: dto.duration,
        breakDuration: dto.breakDuration,
        status: dto.status || 'ACTIVE',
        notes: dto.notes,
        recurrenceType: dto.recurrenceType ?? RecurrenceType.NONE,
        recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : undefined,
        recurrenceDays: dto.recurrenceDays,
      },
      include: { employees: true },
    });

    if (dto.employeeIds?.length) {
      await this.prisma.employeeWorkSchedule.createMany({
        data: dto.employeeIds.map((employeeId) => ({ employeeId, scheduleId: schedule.id })),
        skipDuplicates: true,
      });
    }

    return this.findOne(schedule.id);
  }

  async findAll(query: ListSchedulesQueryDto = {}) {
    if (query.mode === 'compact') {
      return this.findAllCompact(query);
    }
    return this.findAllFlat(query);
  }

  private async findAllFlat(query: ListSchedulesQueryDto) {
    const { take, skip } = this.parsePagination(query);
    const where = this.buildListWhere(query);

    return this.prisma.workSchedule.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take,
      skip,
      select: {
        id: true,
        shiftName: true,
        workDay: true,
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
        duration: true,
        breakDuration: true,
        status: true,
        notes: true,
        recurrenceType: true,
        recurrenceEnd: true,
        recurrenceDays: true,
        employees: {
          select: {
            employeeId: true,
          },
        },
      },
    });
  }

  private async findAllCompact(query: ListSchedulesQueryDto) {
    const { take, skip } = this.parsePagination(query);
    const where = this.buildListWhere(query);
    const fetchTake = Math.min(Math.max((skip + take) * 12, 2000), 10000);

    const rows = await this.prisma.workSchedule.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: fetchTake,
      select: {
        id: true,
        shiftName: true,
        workDay: true,
        startTime: true,
        endTime: true,
        status: true,
        notes: true,
        recurrenceType: true,
        recurrenceDays: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    const grouped = new Map<
      string,
      {
        shiftName: string;
        status: string;
        recurrenceType: RecurrenceType;
        recurrenceDays: string | null;
        workDays: Set<string>;
        startClock: string;
        endClock: string;
        rangeStart: Date;
        rangeEnd: Date;
        occurrences: number;
        employeeAssignments: number;
        notes: string | null;
      }
    >();

    for (const row of rows) {
      const startClock = this.resolveClockFromDate(row.startTime) || '00:00';
      const endClock = this.resolveClockFromDate(row.endTime) || '00:00';
      const recurrenceDays = row.recurrenceDays || null;
      const normalizedWorkDay = this.normalizeCompactWorkDay(row.workDay, row.startTime);
      const key = [
        row.shiftName,
        row.status,
        row.recurrenceType,
        recurrenceDays || '',
        startClock,
        endClock,
      ].join('|');

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          shiftName: row.shiftName,
          status: row.status,
          recurrenceType: row.recurrenceType,
          recurrenceDays,
          workDays: new Set(normalizedWorkDay ? [normalizedWorkDay] : []),
          startClock,
          endClock,
          rangeStart: row.startTime,
          rangeEnd: row.startTime,
          occurrences: 1,
          employeeAssignments: row._count.employees,
          notes: row.notes || null,
        });
        continue;
      }

      existing.occurrences += 1;
      // Compact view should show assigned employees for the schedule pattern,
      // not a cumulative total across every occurrence.
      existing.employeeAssignments = Math.max(existing.employeeAssignments, row._count.employees);
      if (normalizedWorkDay) {
        existing.workDays.add(normalizedWorkDay);
      }
      if (row.startTime < existing.rangeStart) {
        existing.rangeStart = row.startTime;
      }
      if (row.startTime > existing.rangeEnd) {
        existing.rangeEnd = row.startTime;
      }
      if (!existing.notes && row.notes) {
        existing.notes = row.notes;
      }
    }

    const compactRows: CompactScheduleRow[] = Array.from(grouped.values())
      .map((group) => ({
        id: [
          group.shiftName,
          group.status,
          group.recurrenceType,
          group.recurrenceDays || '',
          group.startClock,
          group.endClock,
        ].join('|'),
        compact: true as const,
        shiftName: group.shiftName,
        status: group.status,
        recurrenceType: group.recurrenceType,
        recurrenceDays: group.recurrenceDays,
        workDays: Array.from(group.workDays).sort((a, b) => this.weekdayOrder(a) - this.weekdayOrder(b)),
        startClock: group.startClock,
        endClock: group.endClock,
        rangeStart: group.rangeStart.toISOString(),
        rangeEnd: group.rangeEnd.toISOString(),
        occurrences: group.occurrences,
        employeeAssignments: group.employeeAssignments,
        notes: group.notes,
      }))
      .sort((a, b) => b.rangeEnd.localeCompare(a.rangeEnd));

    return compactRows.slice(skip, skip + take);
  }

  async findOne(id: number) {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    return schedule;
  }

  update(id: number, dto: UpdateScheduleDto) {
    return this.prisma.workSchedule.update({
      where: { id },
      data: {
        shiftName: dto.shiftName,
        workDay: dto.workDay,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        breakStart: dto.breakStart ? new Date(dto.breakStart) : undefined,
        breakEnd: dto.breakEnd ? new Date(dto.breakEnd) : undefined,
        duration: dto.duration,
        breakDuration: dto.breakDuration,
        status: dto.status,
        notes: dto.notes,
        recurrenceType: dto.recurrenceType,
        recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : undefined,
        recurrenceDays: dto.recurrenceDays,
      },
    });
  }

  assignEmployee(scheduleId: number, employeeId: number) {
    return this.prisma.employeeWorkSchedule.upsert({
      where: { employeeId_scheduleId: { employeeId, scheduleId } },
      update: {},
      create: { employeeId, scheduleId },
    });
  }

  async previewOrApplyBulk(dto: BulkScheduleDto) {
    if (!dto.employeeIds?.length) {
      throw new BadRequestException('At least one employee is required for bulk scheduling.');
    }

    const base = await this.resolveBulkBase(dto);
    const recurrenceType = base.recurrenceType;
    const dateKeys = this.enumerateDateKeys(dto.dateFrom, dto.dateTo, recurrenceType, base.recurrenceDays);
    const candidates = this.buildCandidates(dateKeys, base);

    const warnings: ConflictWarning[] = [];
    const employeeRows = await this.prisma.employee.findMany({
      where: { id: { in: dto.employeeIds } },
      select: { id: true },
    });
    const existingEmployeeIds = new Set(employeeRows.map((row) => row.id));
    const validEmployeeIds = dto.employeeIds.filter((id) => existingEmployeeIds.has(id));
    const missingEmployeeIds = dto.employeeIds.filter((id) => !existingEmployeeIds.has(id));

    for (const missingEmployeeId of missingEmployeeIds) {
      warnings.push({
        employeeId: missingEmployeeId,
        date: dto.dateFrom,
        type: 'MISSING_EMPLOYEE',
        message: `Employee ${missingEmployeeId} was not found and will be skipped.`,
      });
    }

    if (!validEmployeeIds.length) {
      return {
        apply: false,
        created: 0,
        skipped: 0,
        previewCount: 0,
        warnings,
      };
    }

    const previewCount = validEmployeeIds.length * candidates.length;
    const rangeStart = this.combineDateAndClock(dto.dateFrom, '00:00');
    const rangeEnd = new Date(this.combineDateAndClock(dto.dateTo, '23:59').getTime() + 60_000);

    const existingAssignments = await this.prisma.employeeWorkSchedule.findMany({
      where: {
        employeeId: { in: validEmployeeIds },
        workSchedule: {
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
      },
      include: {
        workSchedule: true,
      },
    });

    const existingByEmployee = new Map<number, typeof existingAssignments>();
    for (const record of existingAssignments) {
      const bucket = existingByEmployee.get(record.employeeId) || [];
      bucket.push(record);
      existingByEmployee.set(record.employeeId, bucket);
    }

    for (const employeeId of validEmployeeIds) {
      const localAssignments = existingByEmployee.get(employeeId) || [];
      for (const candidate of candidates) {
        const sameDayAssignments = localAssignments.filter(
          (assignment) => this.resolveDayKey(assignment.workSchedule.startTime) === candidate.dateKey,
        );

        for (const assignment of sameDayAssignments) {
          const current = assignment.workSchedule;
          if (
            current.startTime.getTime() === candidate.startTime.getTime() &&
            current.endTime.getTime() === candidate.endTime.getTime()
          ) {
            warnings.push({
              employeeId,
              date: candidate.dateKey,
              type: 'DUPLICATE',
              message: `Duplicate schedule exists for employee ${employeeId} on ${candidate.dateKey}.`,
            });
            continue;
          }

          if (this.overlaps(current.startTime, current.endTime, candidate.startTime, candidate.endTime)) {
            warnings.push({
              employeeId,
              date: candidate.dateKey,
              type: 'OVERLAP',
              message: `Overlap detected for employee ${employeeId} on ${candidate.dateKey}.`,
            });
          }
        }
      }

      const scheduledDays = new Set(candidates.map((candidate) => candidate.dateKey));
      if (scheduledDays.size >= 7) {
        warnings.push({
          employeeId,
          date: dto.dateFrom,
          type: 'MISSING_REST_DAY',
          message: `Employee ${employeeId} may have no rest day in selected range.`,
        });
      }
    }

    if (!dto.apply) {
      return {
        apply: false,
        created: 0,
        skipped: warnings.filter((warning) => warning.type === 'DUPLICATE' || warning.type === 'OVERLAP').length,
        previewCount,
        warnings,
        generated: candidates.map((candidate) => ({
          ...candidate,
          startTime: candidate.startTime.toISOString(),
          endTime: candidate.endTime.toISOString(),
          breakStart: candidate.breakStart?.toISOString() || null,
          breakEnd: candidate.breakEnd?.toISOString() || null,
        })),
      };
    }

    const conflictKey = new Set(
      warnings
        .filter((warning) => warning.type === 'DUPLICATE' || warning.type === 'OVERLAP')
        .map((warning) => `${warning.employeeId}|${warning.date}`),
    );

    let created = 0;
    for (const employeeId of validEmployeeIds) {
      for (const candidate of candidates) {
        if (conflictKey.has(`${employeeId}|${candidate.dateKey}`)) {
          continue;
        }

        const schedule = await this.prisma.workSchedule.create({
          data: {
            shiftName: candidate.shiftName,
            workDay: candidate.workDay,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            breakStart: candidate.breakStart,
            breakEnd: candidate.breakEnd,
            duration: candidate.duration,
            breakDuration: candidate.breakDuration,
            status: candidate.status,
            notes: candidate.notes,
            recurrenceType: candidate.recurrenceType,
            recurrenceDays: candidate.recurrenceDays,
          },
        });

        await this.prisma.employeeWorkSchedule.create({
          data: {
            employeeId,
            scheduleId: schedule.id,
            templateId: dto.templateId || undefined,
          },
        });
        created += 1;
      }
    }

    return {
      apply: true,
      created,
      skipped: previewCount - created,
      previewCount,
      warnings,
    };
  }

  async remove(id: number) {
    await this.prisma.workSchedule.delete({ where: { id } });
    return { success: true };
  }
}
