import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSource, EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeRecordDto } from './dto/create-time-record.dto';
import { UpdateTimeRecordDto } from './dto/update-time-record.dto';

const MANILA_OFFSET_MINUTES = 8 * 60;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private combineManilaDateAndClock(createdDate?: string, clock?: string) {
    if (!createdDate || !clock) return undefined;
    const normalizedDate = createdDate.trim();
    const normalizedClock = clock.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return undefined;
    if (!/^\d{2}:\d{2}$/.test(normalizedClock)) return undefined;

    const candidate = new Date(`${normalizedDate}T${normalizedClock}:00+08:00`);
    return Number.isNaN(candidate.getTime()) ? undefined : candidate;
  }

  private manilaDayRangeFromParts(year: number, month: number, day: number) {
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - MANILA_OFFSET_MINUTES * 60_000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private parseDateInput(value?: string) {
    if (!value) return null;
    const trimmed = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return { year, month, day };
  }

  private getManilaDayRange(reference = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(reference);

    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      const fallback = new Date(reference.getTime() + MANILA_OFFSET_MINUTES * 60_000);
      const fallbackStart = new Date(
        Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate()) - MANILA_OFFSET_MINUTES * 60_000,
      );
      return { start: fallbackStart, end: new Date(fallbackStart.getTime() + 24 * 60 * 60 * 1000) };
    }

    return this.manilaDayRangeFromParts(year, month, day);
  }

  private getManilaDateRangeFromFilter(from?: string, to?: string) {
    const defaultToday = this.getManilaDayRange();
    const parsedFrom = this.parseDateInput(from);
    const parsedTo = this.parseDateInput(to);

    const fromRange = parsedFrom ? this.manilaDayRangeFromParts(parsedFrom.year, parsedFrom.month, parsedFrom.day) : null;
    const toRange = parsedTo ? this.manilaDayRangeFromParts(parsedTo.year, parsedTo.month, parsedTo.day) : null;

    const start = fromRange?.start ?? toRange?.start ?? defaultToday.start;
    const end = toRange?.end ?? fromRange?.end ?? defaultToday.end;

    if (start > end) {
      return { start: end, end: start };
    }

    return { start, end };
  }

  create(dto: CreateTimeRecordDto, actorUsername?: string) {
    const derivedTimeIn = this.combineManilaDateAndClock(dto.createdDate, dto.timeInClock);
    const derivedTimeOut = this.combineManilaDateAndClock(dto.createdDate, dto.timeOutClock);
    const isManualClockPayload = Boolean(dto.createdDate && (dto.timeInClock || dto.timeOutClock));

    return this.prisma.timeRecord.create({
      data: {
        employeeId: dto.employeeId,
        timeIn: dto.timeIn ? new Date(dto.timeIn) : derivedTimeIn,
        timeOut: dto.timeOut ? new Date(dto.timeOut) : derivedTimeOut,
        locationIn: dto.locationIn,
        locationOut: dto.locationOut,
        encoder: dto.encoder ?? actorUsername,
        source: dto.source ?? (isManualClockPayload ? AttendanceSource.ADMIN_MANUAL : AttendanceSource.REMOTE_CLOCK),
        manualReason: dto.manualReason,
      },
    });
  }

  findAll(filters?: { from?: string; to?: string; source?: AttendanceSource }) {
    const hasDateFilter = Boolean(filters?.from || filters?.to);
    const dateRange = hasDateFilter ? this.getManilaDateRangeFromFilter(filters?.from, filters?.to) : null;

    return this.prisma.timeRecord.findMany({
      where: {
        source: filters?.source,
        ...(dateRange
          ? {
              OR: [
                { timeIn: { gte: dateRange.start, lt: dateRange.end } },
                { createdAt: { gte: dateRange.start, lt: dateRange.end } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  findByEmployee(employeeId: number, filters?: { from?: string; to?: string }) {
    const hasDateFilter = Boolean(filters?.from || filters?.to);
    const dateRange = hasDateFilter ? this.getManilaDateRangeFromFilter(filters?.from, filters?.to) : null;

    return this.prisma.timeRecord.findMany({
      where: {
        employeeId,
        ...(dateRange
          ? {
              OR: [
                { timeIn: { gte: dateRange.start, lt: dateRange.end } },
                { createdAt: { gte: dateRange.start, lt: dateRange.end } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  findToday(filters?: { from?: string; to?: string }) {
    const { start, end } = this.getManilaDateRangeFromFilter(filters?.from, filters?.to);

    return this.prisma.timeRecord.findMany({
      where: {
        OR: [
          { timeIn: { gte: start, lt: end } },
          { createdAt: { gte: start, lt: end } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  findNoTimeOut(filters?: { from?: string; to?: string }) {
    const hasDateFilter = Boolean(filters?.from || filters?.to);
    const dateRange = hasDateFilter ? this.getManilaDateRangeFromFilter(filters?.from, filters?.to) : null;

    return this.prisma.timeRecord.findMany({
      where: {
        timeIn: { not: null },
        timeOut: null,
        ...(dateRange
          ? {
              OR: [
                { timeIn: { gte: dateRange.start, lt: dateRange.end } },
                { createdAt: { gte: dateRange.start, lt: dateRange.end } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  async findNoTimeIn() {
    const { start, end } = this.getManilaDayRange();
    const now = new Date();

    const employees = await this.prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
        workSchedules: {
          some: {
            workSchedule: {
              status: 'ACTIVE',
              startTime: {
                gte: start,
                lt: end,
                lte: now,
              },
            },
          },
        },
        timeRecords: {
          none: {
            timeIn: {
              gte: start,
              lt: end,
            },
          },
        },
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        store: {
          select: {
            area: true,
          },
        },
        workSchedules: {
          where: {
            workSchedule: {
              status: 'ACTIVE',
              startTime: {
                gte: start,
                lt: end,
                lte: now,
              },
            },
          },
          select: {
            workSchedule: {
              select: {
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    });

    return employees
      .map((employee) => {
        const schedules = employee.workSchedules
          .map((entry) => entry.workSchedule)
          .sort((left, right) => left.startTime.getTime() - right.startTime.getTime());

        const firstSchedule = schedules[0];
        const lastSchedule = schedules[schedules.length - 1];

        return {
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: `${employee.firstName} ${employee.lastName}`.trim(),
          storeArea: employee.store?.area || null,
          scheduleStartTime: firstSchedule?.startTime ?? null,
          scheduleEndTime: lastSchedule?.endTime ?? null,
          scheduleCount: schedules.length,
        };
      })
      .sort((left, right) => {
        const leftTime = left.scheduleStartTime ? new Date(left.scheduleStartTime).getTime() : 0;
        const rightTime = right.scheduleStartTime ? new Date(right.scheduleStartTime).getTime() : 0;
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return left.employeeCode.localeCompare(right.employeeCode);
      });
  }

  async findOne(id: number) {
    const record = await this.prisma.timeRecord.findUnique({ where: { id }, include: { employee: true } });
    if (!record) throw new NotFoundException('Time record not found');
    return record;
  }

  update(id: number, dto: UpdateTimeRecordDto) {
    const derivedTimeIn = this.combineManilaDateAndClock(dto.createdDate, dto.timeInClock);
    const derivedTimeOut = this.combineManilaDateAndClock(dto.createdDate, dto.timeOutClock);

    return this.prisma.timeRecord.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        timeIn: dto.timeIn ? new Date(dto.timeIn) : derivedTimeIn,
        timeOut: dto.timeOut ? new Date(dto.timeOut) : derivedTimeOut,
        locationIn: dto.locationIn,
        locationOut: dto.locationOut,
        encoder: dto.encoder,
        source: dto.source,
        manualReason: dto.manualReason,
      },
    });
  }

  todayStats() {
    const { start, end } = this.getManilaDayRange();
    return this.prisma.timeRecord.groupBy({
      by: ['employeeId'],
      where: { createdAt: { gte: start, lt: end } },
      _count: { employeeId: true },
    });
  }

  async remove(id: number) {
    await this.prisma.timeRecord.delete({ where: { id } });
    return { success: true };
  }
}
