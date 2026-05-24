import { BadRequestException, Injectable } from '@nestjs/common';
import {
  EmployeeStatus,
  LeaveStatus,
  PaymentStatus,
  PayrollStatus,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MANILA_DAY_MS = 24 * 60 * 60 * 1000;
const MANILA_OFFSET_MINUTES = 8 * 60;
const WORKDAY_HOURS = 8;
const EXCEPTION_TYPES = ['NO_TIMEOUT', 'NO_TIMEIN', 'DUPLICATE', 'MISSING_LOCATION', 'MISSING_IMAGE'] as const;

type ExceptionType = (typeof EXCEPTION_TYPES)[number];
type ReportQueryFilters = {
  from?: string;
  to?: string;
  storeId?: string;
  groupId?: string;
  employeeId?: string;
  status?: string;
  type?: string;
  leaveType?: string;
  coverageFrom?: string;
  coverageTo?: string;
};

type ScopedEmployee = {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  status: EmployeeStatus;
  salary?: Prisma.Decimal | null;
  store: {
    id: number;
    code: string;
    name: string;
    area: string | null;
  } | null;
};

type ScheduleSnapshot = {
  startTime: Date;
  endTime: Date;
  breakStart: Date | null;
  breakEnd: Date | null;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async attendanceSummary(filters: ReportQueryFilters) {
    const range = this.toManilaRange(filters.from, filters.to);
    const scopedEmployees = await this.resolveScopedEmployees(filters, filters.status);
    const scopedEmployeeMap = new Map(scopedEmployees.map((employee) => [employee.id, employee]));
    const dayKeys = this.buildDayKeys(range.start, range.endExclusive);

    if (!scopedEmployees.length) {
      return {
        filters: {
          from: range.from,
          to: range.to,
          storeId: filters.storeId ? Number(filters.storeId) : null,
          groupId: filters.groupId ? Number(filters.groupId) : null,
          employeeId: filters.employeeId ? Number(filters.employeeId) : null,
          status: filters.status || 'ACTIVE',
        },
        kpis: {
          expectedEmployees: 0,
          presentEmployees: 0,
          lateEmployees: 0,
          noTimeOutRecords: 0,
          absentEmployees: 0,
          totalRecords: 0,
        },
        trend: dayKeys.map((date) => ({
          date,
          present: 0,
          late: 0,
          noTimeOut: 0,
          absent: 0,
        })),
        rows: [],
      };
    }

    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const [records, employeeSchedules] = await Promise.all([
      this.prisma.timeRecord.findMany({
        where: {
          employeeId: { in: scopedEmployeeIds },
          OR: [
            { timeIn: { gte: range.start, lt: range.endExclusive } },
            { createdAt: { gte: range.start, lt: range.endExclusive } },
          ],
        },
        include: {
          employee: {
            include: {
              store: {
                select: { id: true, code: true, name: true, area: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.employeeWorkSchedule.findMany({
        where: {
          employeeId: { in: scopedEmployeeIds },
          workSchedule: {
            startTime: { gte: range.start, lt: range.endExclusive },
          },
        },
        select: {
          employeeId: true,
          workSchedule: {
            select: {
              startTime: true,
              endTime: true,
              breakStart: true,
              breakEnd: true,
            },
          },
        },
      }),
    ]);

    const scheduleMap = new Map<string, ScheduleSnapshot>();
    for (const assignment of employeeSchedules) {
      const dayKey = this.toManilaDayKey(assignment.workSchedule.startTime);
      const mapKey = this.dayEmployeeKey(assignment.employeeId, dayKey);
      const existing = scheduleMap.get(mapKey);
      if (!existing || assignment.workSchedule.startTime < existing.startTime) {
        scheduleMap.set(mapKey, {
          startTime: assignment.workSchedule.startTime,
          endTime: assignment.workSchedule.endTime,
          breakStart: assignment.workSchedule.breakStart,
          breakEnd: assignment.workSchedule.breakEnd,
        });
      }
    }

    const presentEmployees = new Set<number>();
    const lateEmployees = new Set<number>();
    const trendAccumulator = new Map<
      string,
      {
        present: Set<number>;
        late: Set<number>;
        noTimeOut: number;
      }
    >();

    for (const dayKey of dayKeys) {
      trendAccumulator.set(dayKey, {
        present: new Set<number>(),
        late: new Set<number>(),
        noTimeOut: 0,
      });
    }

    const rows = records.map((record) => {
      const referenceDate = record.timeIn || record.createdAt;
      const dateKey = this.toManilaDayKey(referenceDate);
      const schedule = scheduleMap.get(this.dayEmployeeKey(record.employeeId, dateKey));

      const lateMinutes = this.computeLateMinutes(record.timeIn, schedule?.startTime);
      const workedHours = this.computeWorkedHours(
        record.timeIn,
        record.timeOut,
        schedule?.breakStart ?? null,
        schedule?.breakEnd ?? null,
      );
      const status = this.resolveAttendanceStatus(record.timeIn, record.timeOut, lateMinutes);

      const employee = record.employee;
      const employeeProfile = scopedEmployeeMap.get(record.employeeId);
      const employeeCode = employee?.employeeCode || employeeProfile?.employeeCode || '';
      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`.trim()
        : `${employeeProfile?.firstName || ''} ${employeeProfile?.lastName || ''}`.trim();
      const storeLabel =
        employee?.store?.area || employeeProfile?.store?.area || employee?.store?.name || employeeProfile?.store?.name || '';

      if (record.timeIn) {
        presentEmployees.add(record.employeeId);
      }
      if (lateMinutes > 0) {
        lateEmployees.add(record.employeeId);
      }

      const trendEntry = trendAccumulator.get(dateKey);
      if (trendEntry) {
        if (record.timeIn) {
          trendEntry.present.add(record.employeeId);
        }
        if (lateMinutes > 0) {
          trendEntry.late.add(record.employeeId);
        }
        if (record.timeIn && !record.timeOut) {
          trendEntry.noTimeOut += 1;
        }
      }

      return {
        id: record.id,
        date: dateKey,
        employeeId: record.employeeId,
        employeeCode,
        employeeName,
        employeeStatus: employee?.status || employeeProfile?.status || null,
        store: storeLabel,
        scheduleStart: schedule?.startTime || null,
        scheduleEnd: schedule?.endTime || null,
        timeIn: record.timeIn,
        timeOut: record.timeOut,
        lateMinutes,
        workedHours,
        status,
        locationIn: record.locationIn,
        locationOut: record.locationOut,
        source: record.source,
        timeInImage: record.timeInImage,
        timeOutImage: record.timeOutImage,
      };
    });

    const expectedEmployees = scopedEmployees.length;
    const noTimeOutRecords = rows.filter((row) => row.status === 'No Time Out').length;
    const absentEmployees = Math.max(expectedEmployees - presentEmployees.size, 0);

    const trend = dayKeys.map((date) => {
      const entry = trendAccumulator.get(date);
      if (!entry) {
        return {
          date,
          present: 0,
          late: 0,
          noTimeOut: 0,
          absent: expectedEmployees,
        };
      }

      const presentCount = entry.present.size;
      return {
        date,
        present: presentCount,
        late: entry.late.size,
        noTimeOut: entry.noTimeOut,
        absent: Math.max(expectedEmployees - presentCount, 0),
      };
    });

    return {
      filters: {
        from: range.from,
        to: range.to,
        storeId: filters.storeId ? Number(filters.storeId) : null,
        groupId: filters.groupId ? Number(filters.groupId) : null,
        employeeId: filters.employeeId ? Number(filters.employeeId) : null,
        status: filters.status || 'ACTIVE',
      },
      kpis: {
        expectedEmployees,
        presentEmployees: presentEmployees.size,
        lateEmployees: lateEmployees.size,
        noTimeOutRecords,
        absentEmployees,
        totalRecords: rows.length,
      },
      trend,
      rows,
    };
  }

  async attendanceExceptions(filters: ReportQueryFilters) {
    const range = this.toManilaRange(filters.from, filters.to);
    const scopedEmployees = await this.resolveScopedEmployees(filters, filters.status);
    const typeFilter = this.parseExceptionTypeFilter(filters.type);

    if (!scopedEmployees.length) {
      return {
        filters: {
          from: range.from,
          to: range.to,
          type: filters.type || '',
        },
        kpis: {
          total: 0,
          noTimeOut: 0,
          noTimeIn: 0,
          duplicate: 0,
          missingLocation: 0,
          missingImage: 0,
        },
        rows: [],
      };
    }

    const scopedEmployeeMap = new Map(scopedEmployees.map((employee) => [employee.id, employee]));
    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const records = await this.prisma.timeRecord.findMany({
      where: {
        employeeId: { in: scopedEmployeeIds },
        OR: [
          { timeIn: { gte: range.start, lt: range.endExclusive } },
          { createdAt: { gte: range.start, lt: range.endExclusive } },
        ],
      },
      include: {
        employee: {
          include: {
            store: {
              select: { id: true, code: true, name: true, area: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const duplicateCounts = new Map<string, number>();
    for (const record of records) {
      const reference = record.timeIn || record.createdAt;
      const dayKey = this.toManilaDayKey(reference);
      const key = this.dayEmployeeKey(record.employeeId, dayKey);
      duplicateCounts.set(key, (duplicateCounts.get(key) || 0) + 1);
    }

    const rows: Array<{
      id: string;
      type: ExceptionType;
      label: string;
      date: string;
      employeeId: number;
      employeeCode: string;
      employeeName: string;
      store: string;
      source: string;
      timeIn: Date | null;
      timeOut: Date | null;
      location: string;
      notes: string;
      hasTimeInImage: boolean;
      hasTimeOutImage: boolean;
    }> = [];

    for (const record of records) {
      const reference = record.timeIn || record.timeOut || record.createdAt;
      const dayKey = this.toManilaDayKey(reference);
      const duplicateKey = this.dayEmployeeKey(record.employeeId, dayKey);

      const triggeredTypes: ExceptionType[] = [];
      if (record.timeIn && !record.timeOut) {
        triggeredTypes.push('NO_TIMEOUT');
      }
      if (!record.timeIn && record.timeOut) {
        triggeredTypes.push('NO_TIMEIN');
      }
      if ((duplicateCounts.get(duplicateKey) || 0) > 1) {
        triggeredTypes.push('DUPLICATE');
      }
      if ((record.timeIn && !record.locationIn) || (record.timeOut && !record.locationOut)) {
        triggeredTypes.push('MISSING_LOCATION');
      }
      if ((record.timeIn && !record.timeInImage) || (record.timeOut && !record.timeOutImage)) {
        triggeredTypes.push('MISSING_IMAGE');
      }

      if (!triggeredTypes.length) {
        continue;
      }

      const employee = record.employee || scopedEmployeeMap.get(record.employeeId);
      const employeeCode = employee?.employeeCode || '';
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : '';
      const storeLabel = employee?.store?.area || employee?.store?.name || '';

      for (const type of triggeredTypes) {
        if (typeFilter && !typeFilter.has(type)) {
          continue;
        }

        rows.push({
          id: `${type}-${record.id}`,
          type,
          label: this.exceptionLabel(type),
          date: dayKey,
          employeeId: record.employeeId,
          employeeCode,
          employeeName,
          store: storeLabel,
          source: String(record.source),
          timeIn: record.timeIn,
          timeOut: record.timeOut,
          location: [record.locationIn, record.locationOut].filter(Boolean).join(' / '),
          notes: this.buildExceptionNote(type, record),
          hasTimeInImage: Boolean(record.timeInImage),
          hasTimeOutImage: Boolean(record.timeOutImage),
        });
      }
    }

    const kpis = {
      total: rows.length,
      noTimeOut: rows.filter((row) => row.type === 'NO_TIMEOUT').length,
      noTimeIn: rows.filter((row) => row.type === 'NO_TIMEIN').length,
      duplicate: rows.filter((row) => row.type === 'DUPLICATE').length,
      missingLocation: rows.filter((row) => row.type === 'MISSING_LOCATION').length,
      missingImage: rows.filter((row) => row.type === 'MISSING_IMAGE').length,
    };

    return {
      filters: {
        from: range.from,
        to: range.to,
        type: filters.type || '',
      },
      kpis,
      rows,
    };
  }

  async lateOvertime(filters: ReportQueryFilters) {
    const range = this.toManilaRange(filters.from, filters.to);
    const scopedEmployees = await this.resolveScopedEmployees(filters, filters.status);
    const dayKeys = this.buildDayKeys(range.start, range.endExclusive);

    if (!scopedEmployees.length) {
      return {
        filters: {
          from: range.from,
          to: range.to,
          storeId: filters.storeId ? Number(filters.storeId) : null,
          groupId: filters.groupId ? Number(filters.groupId) : null,
          employeeId: filters.employeeId ? Number(filters.employeeId) : null,
          status: filters.status || 'ACTIVE',
        },
        kpis: {
          totalLateHours: 0,
          totalOvertimeHours: 0,
          lateDeductionEstimate: 0,
          overtimePayEstimate: 0,
          netImpactEstimate: 0,
        },
        trend: dayKeys.map((day) => ({ date: day, lateHours: 0, overtimeHours: 0 })),
        rows: [],
      };
    }

    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const [records, schedules] = await Promise.all([
      this.prisma.timeRecord.findMany({
        where: {
          employeeId: { in: scopedEmployeeIds },
          OR: [
            { timeIn: { gte: range.start, lt: range.endExclusive } },
            { createdAt: { gte: range.start, lt: range.endExclusive } },
          ],
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.employeeWorkSchedule.findMany({
        where: {
          employeeId: { in: scopedEmployeeIds },
          workSchedule: {
            startTime: { gte: range.start, lt: range.endExclusive },
          },
        },
        select: {
          employeeId: true,
          workSchedule: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      }),
    ]);

    const scheduleMap = new Map<string, { start: Date; end: Date }>();
    for (const assignment of schedules) {
      const dayKey = this.toManilaDayKey(assignment.workSchedule.startTime);
      const key = this.dayEmployeeKey(assignment.employeeId, dayKey);
      const current = scheduleMap.get(key);
      if (!current || assignment.workSchedule.startTime < current.start) {
        scheduleMap.set(key, {
          start: assignment.workSchedule.startTime,
          end: assignment.workSchedule.endTime,
        });
      }
    }

    const recordMap = new Map<string, { timeIn: Date | null; timeOut: Date | null }>();
    for (const record of records) {
      const reference = record.timeIn || record.createdAt;
      const dayKey = this.toManilaDayKey(reference);
      const key = this.dayEmployeeKey(record.employeeId, dayKey);
      const existing = recordMap.get(key);
      const currentTime = (record.timeIn || record.createdAt).getTime();
      const existingTime = existing?.timeIn?.getTime() ?? Number.POSITIVE_INFINITY;
      if (!existing || currentTime < existingTime) {
        recordMap.set(key, {
          timeIn: record.timeIn,
          timeOut: record.timeOut,
        });
      }
    }

    const trendMap = new Map<string, { lateHours: number; overtimeHours: number }>();
    for (const dayKey of dayKeys) {
      trendMap.set(dayKey, { lateHours: 0, overtimeHours: 0 });
    }

    const rows = scopedEmployees.map((employee) => {
      let daysWorked = 0;
      let lateMinutes = 0;
      let overtimeMinutes = 0;

      for (const dayKey of dayKeys) {
        const record = recordMap.get(this.dayEmployeeKey(employee.id, dayKey));
        if (!record?.timeIn) continue;
        daysWorked += 1;
        const schedule = scheduleMap.get(this.dayEmployeeKey(employee.id, dayKey));

        if (schedule) {
          lateMinutes += this.computeLateMinutes(record.timeIn, schedule.start);
          if (record.timeOut && record.timeOut > schedule.end) {
            overtimeMinutes += Math.max(0, Math.floor((record.timeOut.getTime() - schedule.end.getTime()) / 60_000));
          }
        }
      }

      const lateHours = round2(lateMinutes / 60);
      const overtimeHours = round2(overtimeMinutes / 60);
      const dailyRate = toNumber(employee.salary);
      const hourlyRate = dailyRate > 0 ? dailyRate / WORKDAY_HOURS : 0;
      const lateDeduction = round2(lateHours * hourlyRate);
      const overtimePay = round2(overtimeHours * hourlyRate);
      const netImpact = round2(overtimePay - lateDeduction);

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        store: employee.store?.area || employee.store?.name || '',
        totalDaysWorked: daysWorked,
        lateHours,
        overtimeHours,
        lateDeduction,
        overtimePay,
        netImpact,
      };
    });

    for (const dayKey of dayKeys) {
      let late = 0;
      let overtime = 0;
      for (const employee of scopedEmployees) {
        const record = recordMap.get(this.dayEmployeeKey(employee.id, dayKey));
        if (!record?.timeIn) continue;
        const schedule = scheduleMap.get(this.dayEmployeeKey(employee.id, dayKey));
        if (!schedule) continue;
        late += this.computeLateMinutes(record.timeIn, schedule.start) / 60;
        if (record.timeOut && record.timeOut > schedule.end) {
          overtime += Math.max(0, Math.floor((record.timeOut.getTime() - schedule.end.getTime()) / 60_000)) / 60;
        }
      }
      trendMap.set(dayKey, {
        lateHours: round2(late),
        overtimeHours: round2(overtime),
      });
    }

    const totalLateHours = round2(rows.reduce((sum, row) => sum + row.lateHours, 0));
    const totalOvertimeHours = round2(rows.reduce((sum, row) => sum + row.overtimeHours, 0));
    const lateDeductionEstimate = round2(rows.reduce((sum, row) => sum + row.lateDeduction, 0));
    const overtimePayEstimate = round2(rows.reduce((sum, row) => sum + row.overtimePay, 0));

    return {
      filters: {
        from: range.from,
        to: range.to,
        storeId: filters.storeId ? Number(filters.storeId) : null,
        groupId: filters.groupId ? Number(filters.groupId) : null,
        employeeId: filters.employeeId ? Number(filters.employeeId) : null,
        status: filters.status || 'ACTIVE',
      },
      kpis: {
        totalLateHours,
        totalOvertimeHours,
        lateDeductionEstimate,
        overtimePayEstimate,
        netImpactEstimate: round2(overtimePayEstimate - lateDeductionEstimate),
      },
      trend: dayKeys.map((day) => ({
        date: day,
        lateHours: trendMap.get(day)?.lateHours || 0,
        overtimeHours: trendMap.get(day)?.overtimeHours || 0,
      })),
      rows,
    };
  }

  async leaveUtilization(filters: ReportQueryFilters) {
    const range = this.toManilaRange(filters.from, filters.to);
    const scopedEmployees = await this.resolveScopedEmployees(filters);
    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const employeeMap = new Map(scopedEmployees.map((employee) => [employee.id, employee]));
    const leaveStatus = this.parseLeaveStatusFilter(filters.status);
    const leaveTypeFilter = this.parseOptionalText(filters.leaveType);

    if (!scopedEmployeeIds.length) {
      return {
        filters: {
          from: range.from,
          to: range.to,
          status: filters.status || 'ALL',
          leaveType: filters.leaveType || 'ALL',
        },
        kpis: {
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          avgLeaveDaysPerRequest: 0,
          totalRequests: 0,
        },
        trend: [],
        rows: [],
        balances: [],
      };
    }

    const [leaveRows, balancesRaw] = await Promise.all([
      this.prisma.employeeLeave.findMany({
        where: {
          employeeId: { in: scopedEmployeeIds },
          startDate: { lte: new Date(range.endExclusive.getTime() - 1) },
          endDate: { gte: range.start },
          ...(leaveStatus ? { status: leaveStatus } : {}),
          ...(leaveTypeFilter ? { leaveType: leaveTypeFilter } : {}),
        },
        include: {
          employee: {
            include: {
              store: {
                select: { id: true, code: true, name: true, area: true },
              },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.employeeLeaveBalance.findMany({
        where: { employeeId: { in: scopedEmployeeIds } },
        include: {
          employee: {
            include: {
              store: {
                select: { id: true, code: true, name: true, area: true },
              },
            },
          },
        },
      }),
    ]);

    const rows = leaveRows.map((leave) => ({
      id: leave.id,
      employeeId: leave.employeeId,
      employeeCode: leave.employee.employeeCode,
      employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
      store: leave.employee.store?.area || leave.employee.store?.name || '',
      leaveType: leave.leaveType,
      dateFiled: leave.createdAt,
      startDate: leave.startDate,
      endDate: leave.endDate,
      duration: leave.duration,
      status: leave.status,
      approver: leave.approvedBy,
      reason: leave.reason,
    }));

    const kpis = {
      pendingRequests: rows.filter((row) => row.status === LeaveStatus.PENDING).length,
      approvedRequests: rows.filter((row) => row.status === LeaveStatus.APPROVED).length,
      rejectedRequests: rows.filter((row) => row.status === LeaveStatus.REJECTED).length,
      avgLeaveDaysPerRequest: rows.length ? round2(rows.reduce((sum, row) => sum + toNumber(row.duration), 0) / rows.length) : 0,
      totalRequests: rows.length,
    };

    const trendMap = new Map<string, { pending: number; approved: number; rejected: number; cancelled: number }>();
    for (const row of rows) {
      const month = this.toManilaMonthKey(row.dateFiled);
      if (!trendMap.has(month)) {
        trendMap.set(month, { pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      }
      const bucket = trendMap.get(month);
      if (!bucket) continue;
      if (row.status === LeaveStatus.PENDING) bucket.pending += 1;
      if (row.status === LeaveStatus.APPROVED) bucket.approved += 1;
      if (row.status === LeaveStatus.REJECTED) bucket.rejected += 1;
      if (row.status === LeaveStatus.CANCELLED) bucket.cancelled += 1;
    }

    const balancesMap = new Map<
      number,
      {
        employeeId: number;
        employeeCode: string;
        employeeName: string;
        store: string;
        vacationTotal: number;
        vacationUsed: number;
        vacationRemaining: number;
        sickTotal: number;
        sickUsed: number;
        sickRemaining: number;
      }
    >();

    for (const balance of balancesRaw) {
      const employee = balance.employee || employeeMap.get(balance.employeeId);
      if (!employee) continue;

      const current =
        balancesMap.get(balance.employeeId) ||
        {
          employeeId: balance.employeeId,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
          store: employee.store?.area || employee.store?.name || '',
          vacationTotal: 0,
          vacationUsed: 0,
          vacationRemaining: 0,
          sickTotal: 0,
          sickUsed: 0,
          sickRemaining: 0,
        };

      const leaveType = String(balance.leaveType || '').trim().toUpperCase();
      const totalLeaves = toNumber(balance.totalLeaves);
      const usedLeaves = toNumber(balance.usedLeaves);
      const remainingLeaves = toNumber(balance.remainingLeaves);
      if (leaveType.includes('VL') || leaveType.includes('VACATION')) {
        current.vacationTotal += totalLeaves;
        current.vacationUsed += usedLeaves;
        current.vacationRemaining += remainingLeaves;
      } else if (leaveType.includes('SL') || leaveType.includes('SICK')) {
        current.sickTotal += totalLeaves;
        current.sickUsed += usedLeaves;
        current.sickRemaining += remainingLeaves;
      }

      balancesMap.set(balance.employeeId, {
        ...current,
        vacationTotal: round2(current.vacationTotal),
        vacationUsed: round2(current.vacationUsed),
        vacationRemaining: round2(current.vacationRemaining),
        sickTotal: round2(current.sickTotal),
        sickUsed: round2(current.sickUsed),
        sickRemaining: round2(current.sickRemaining),
      });
    }

    return {
      filters: {
        from: range.from,
        to: range.to,
        status: filters.status || 'ALL',
        leaveType: filters.leaveType || 'ALL',
      },
      kpis,
      trend: [...trendMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([month, counts]) => ({ month, ...counts })),
      rows,
      balances: [...balancesMap.values()].sort((left, right) => left.employeeCode.localeCompare(right.employeeCode)),
    };
  }

  async payrollCost(filters: ReportQueryFilters) {
    const payrollRange = this.toManilaRange(filters.from, filters.to);
    const coverageRange =
      filters.coverageFrom || filters.coverageTo
        ? this.toManilaRange(filters.coverageFrom, filters.coverageTo)
        : null;
    const scopedEmployees = await this.resolveScopedEmployees(filters);
    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const payrollStatus = this.parsePayrollStatusFilter(filters.status);

    if (!scopedEmployeeIds.length) {
      return {
        filters: {
          from: payrollRange.from,
          to: payrollRange.to,
          coverageFrom: coverageRange?.from || null,
          coverageTo: coverageRange?.to || null,
          status: filters.status || 'ALL',
        },
        kpis: {
          grossTotal: 0,
          deductionsTotal: 0,
          netTotal: 0,
          overtimePayTotal: 0,
          lateDeductionTotal: 0,
        },
        trend: [],
        rows: [],
      };
    }

    const payrollRows = await this.prisma.payroll.findMany({
      where: {
        employeeId: { in: scopedEmployeeIds },
        payrollDate: {
          gte: payrollRange.start,
          lt: payrollRange.endExclusive,
        },
        ...(payrollStatus ? { status: payrollStatus } : {}),
        ...(coverageRange
          ? {
              AND: [
                {
                  OR: [
                    { payrollFrom: null },
                    { payrollFrom: { lt: coverageRange.endExclusive } },
                  ],
                },
                {
                  OR: [
                    { payrollTo: null },
                    { payrollTo: { gte: coverageRange.start } },
                  ],
                },
              ],
            }
          : {}),
      },
      include: {
        employee: {
          include: {
            store: {
              select: { id: true, code: true, name: true, area: true },
            },
          },
        },
      },
      orderBy: [{ payrollDate: 'desc' }],
    });

    const rows = payrollRows.map((row) => ({
      id: row.id,
      payrollDate: row.payrollDate,
      payrollFrom: row.payrollFrom,
      payrollTo: row.payrollTo,
      employeeId: row.employeeId,
      employeeCode: row.employee.employeeCode,
      employeeName: `${row.employee.firstName} ${row.employee.lastName}`.trim(),
      store: row.employee.store?.area || row.employee.store?.name || '',
      daysOfWork: toNumber(row.daysOfWork),
      rate: toNumber(row.rate),
      gross: toNumber(row.totalRegularWage),
      benefits: toNumber(row.totalAllowance),
      deductions: toNumber(row.otherDeduction),
      net: toNumber(row.netAmountPaid),
      overtimeAmount: toNumber(row.overtimeAmount),
      lateAmount: toNumber(row.lateAmount),
      status: row.status,
    }));

    const kpis = {
      grossTotal: round2(rows.reduce((sum, row) => sum + row.gross, 0)),
      deductionsTotal: round2(rows.reduce((sum, row) => sum + row.deductions, 0)),
      netTotal: round2(rows.reduce((sum, row) => sum + row.net, 0)),
      overtimePayTotal: round2(rows.reduce((sum, row) => sum + row.overtimeAmount, 0)),
      lateDeductionTotal: round2(rows.reduce((sum, row) => sum + row.lateAmount, 0)),
    };

    const trendMap = new Map<string, { gross: number; net: number }>();
    for (const row of rows) {
      const day = this.toManilaDayKey(row.payrollDate);
      const current = trendMap.get(day) || { gross: 0, net: 0 };
      current.gross += row.gross;
      current.net += row.net;
      trendMap.set(day, current);
    }

    return {
      filters: {
        from: payrollRange.from,
        to: payrollRange.to,
        coverageFrom: coverageRange?.from || null,
        coverageTo: coverageRange?.to || null,
        status: filters.status || 'ALL',
      },
      kpis,
      trend: [...trendMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, totals]) => ({
          date,
          gross: round2(totals.gross),
          net: round2(totals.net),
        })),
      rows,
    };
  }

  async loansAging(filters: ReportQueryFilters) {
    const range = this.toManilaRange(filters.from, filters.to);
    const scopedEmployees = await this.resolveScopedEmployees(filters);
    const scopedEmployeeIds = scopedEmployees.map((employee) => employee.id);
    const typeFilters = this.parseTypeFilters(filters.type);
    const paymentStatus = this.parsePaymentStatusFilter(filters.status);

    if (!scopedEmployeeIds.length) {
      return {
        filters: {
          from: range.from,
          to: range.to,
          status: filters.status || 'ALL',
          type: filters.type || 'ALL',
        },
        kpis: {
          pendingApprovalAmount: 0,
          approvedUnpaidAmount: 0,
          partialBalanceAmount: 0,
          paidThisPeriod: 0,
          totalOutstandingBalance: 0,
        },
        aging: [
          { bucket: '0-30', amount: 0, count: 0 },
          { bucket: '31-60', amount: 0, count: 0 },
          { bucket: '61-90', amount: 0, count: 0 },
          { bucket: '90+', amount: 0, count: 0 },
        ],
        rows: [],
      };
    }

    const rowsRaw = await this.prisma.cashAdvance.findMany({
      where: {
        employeeId: { in: scopedEmployeeIds },
        dateIssued: { gte: range.start, lt: range.endExclusive },
        ...(typeFilters.length
          ? {
              type: typeFilters.length === 1 ? typeFilters[0] : { in: typeFilters },
            }
          : {}),
        ...(paymentStatus ? { status: paymentStatus } : {}),
      },
      include: {
        employee: {
          include: {
            store: {
              select: { id: true, code: true, name: true, area: true },
            },
          },
        },
      },
      orderBy: [{ dateIssued: 'desc' }],
    });

    const advanceIds = rowsRaw.map((row) => row.id);
    const paidRows = advanceIds.length
      ? await this.prisma.cashAdvancePayment.findMany({
          where: {
            cashAdvanceId: { in: advanceIds },
            paymentDate: { gte: range.start, lt: range.endExclusive },
            status: PaymentStatus.PAID,
          },
          select: {
            amountPaid: true,
          },
        })
      : [];

    const now = new Date();
    const rows = rowsRaw.map((row) => {
      const daysOutstanding = Math.max(0, Math.floor((now.getTime() - row.dateIssued.getTime()) / MANILA_DAY_MS));
      const agingBucket = this.resolveAgingBucket(daysOutstanding);
      return {
        id: row.id,
        atd: row.atd,
        dateIssued: row.dateIssued,
        employeeId: row.employeeId,
        employeeCode: row.employee.employeeCode,
        employeeName: `${row.employee.firstName} ${row.employee.lastName}`.trim(),
        store: row.employee.store?.area || row.employee.store?.name || '',
        type: row.type,
        amount: toNumber(row.amount),
        totalPaid: toNumber(row.totalPaid),
        balance: toNumber(row.balance),
        installmentPlan: row.installmentPlan,
        paymentDue: row.repaymentDue,
        status: row.status,
        daysOutstanding,
        agingBucket,
      };
    });

    const agingMap = new Map<string, { amount: number; count: number }>([
      ['0-30', { amount: 0, count: 0 }],
      ['31-60', { amount: 0, count: 0 }],
      ['61-90', { amount: 0, count: 0 }],
      ['90+', { amount: 0, count: 0 }],
    ]);
    for (const row of rows) {
      if (row.balance <= 0) continue;
      const bucket = agingMap.get(row.agingBucket);
      if (!bucket) continue;
      bucket.amount += row.balance;
      bucket.count += 1;
      agingMap.set(row.agingBucket, bucket);
    }

    const kpis = {
      pendingApprovalAmount: round2(
        rows.filter((row) => row.status === PaymentStatus.PENDING).reduce((sum, row) => sum + row.amount, 0),
      ),
      approvedUnpaidAmount: round2(
        rows.filter((row) => row.status === PaymentStatus.APPROVED).reduce((sum, row) => sum + row.balance, 0),
      ),
      partialBalanceAmount: round2(
        rows.filter((row) => row.status === PaymentStatus.PARTIAL).reduce((sum, row) => sum + row.balance, 0),
      ),
      paidThisPeriod: round2(paidRows.reduce((sum, row) => sum + toNumber(row.amountPaid), 0)),
      totalOutstandingBalance: round2(rows.reduce((sum, row) => sum + row.balance, 0)),
    };

    return {
      filters: {
        from: range.from,
        to: range.to,
        status: filters.status || 'ALL',
        type: filters.type || 'ALL',
      },
      kpis,
      aging: ['0-30', '31-60', '61-90', '90+'].map((bucket) => ({
        bucket,
        amount: round2(agingMap.get(bucket)?.amount || 0),
        count: agingMap.get(bucket)?.count || 0,
      })),
      rows,
    };
  }

  private async resolveScopedEmployees(filters: ReportQueryFilters, employeeStatus?: string) {
    const storeId = this.parseOptionalPositiveInt(filters.storeId, 'storeId');
    const groupId = this.parseOptionalPositiveInt(filters.groupId, 'groupId');
    const employeeId = this.parseOptionalPositiveInt(filters.employeeId, 'employeeId');
    const status = this.parseEmployeeStatusFilter(employeeStatus);

    const where: Prisma.EmployeeWhereInput = {};
    if (storeId) where.storeId = storeId;
    if (groupId) {
      where.groups = { some: { groupId } };
    }
    if (employeeId) {
      where.id = employeeId;
    }
    if (status) {
      where.status = status;
    } else if (employeeStatus !== 'ALL' && employeeStatus !== 'all' && employeeStatus !== undefined && employeeStatus !== '') {
      where.status = EmployeeStatus.ACTIVE;
    }

    return this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        status: true,
        salary: true,
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            area: true,
          },
        },
      },
      orderBy: [{ employeeCode: 'asc' }],
    });
  }

  private parseEmployeeStatusFilter(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') {
      return undefined;
    }
    if (normalized in EmployeeStatus) {
      return EmployeeStatus[normalized as keyof typeof EmployeeStatus];
    }
    throw new BadRequestException(`Invalid employee status value "${value}".`);
  }

  private parseLeaveStatusFilter(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return undefined;
    if (normalized in LeaveStatus) {
      return LeaveStatus[normalized as keyof typeof LeaveStatus];
    }
    throw new BadRequestException(`Invalid leave status value "${value}".`);
  }

  private parsePayrollStatusFilter(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return undefined;
    if (normalized in PayrollStatus) {
      return PayrollStatus[normalized as keyof typeof PayrollStatus];
    }
    throw new BadRequestException(`Invalid payroll status value "${value}".`);
  }

  private parsePaymentStatusFilter(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (!normalized || normalized === 'ALL') return undefined;
    if (normalized in PaymentStatus) {
      return PaymentStatus[normalized as keyof typeof PaymentStatus];
    }
    throw new BadRequestException(`Invalid payment status value "${value}".`);
  }

  private parseOptionalPositiveInt(value: string | undefined, fieldName: string) {
    if (!value || !value.trim()) return undefined;
    const parsed = Number(value.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    return parsed;
  }

  private parseExceptionTypeFilter(value?: string) {
    if (!value || !value.trim()) return undefined;
    const tokens = value
      .split(',')
      .map((token) => token.trim().toUpperCase())
      .filter(Boolean);

    const selected = new Set<ExceptionType>();
    for (const token of tokens) {
      if (EXCEPTION_TYPES.includes(token as ExceptionType)) {
        selected.add(token as ExceptionType);
        continue;
      }
      throw new BadRequestException(`Invalid exception type "${token}".`);
    }
    return selected;
  }

  private parseTypeFilters(value?: string) {
    if (!value || !value.trim()) return [];
    return value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private parseOptionalText(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim();
    if (!normalized || normalized.toUpperCase() === 'ALL') return undefined;
    return normalized;
  }

  private exceptionLabel(type: ExceptionType) {
    if (type === 'NO_TIMEOUT') return 'No Time Out';
    if (type === 'NO_TIMEIN') return 'No Time In';
    if (type === 'DUPLICATE') return 'Duplicate Record';
    if (type === 'MISSING_LOCATION') return 'Missing Location';
    return 'Missing Image';
  }

  private buildExceptionNote(
    type: ExceptionType,
    record: {
      timeIn: Date | null;
      timeOut: Date | null;
      locationIn: string | null;
      locationOut: string | null;
      timeInImage: string | null;
      timeOutImage: string | null;
    },
  ) {
    if (type === 'NO_TIMEOUT') {
      return 'Clock-in captured but no clock-out yet.';
    }
    if (type === 'NO_TIMEIN') {
      return 'Clock-out exists but missing clock-in.';
    }
    if (type === 'DUPLICATE') {
      return 'Multiple attendance entries were found for the same employee and day.';
    }
    if (type === 'MISSING_LOCATION') {
      if (record.timeIn && !record.locationIn) return 'Missing clock-in location.';
      if (record.timeOut && !record.locationOut) return 'Missing clock-out location.';
      return 'Location details are incomplete.';
    }
    if (record.timeIn && !record.timeInImage) return 'Missing clock-in image.';
    if (record.timeOut && !record.timeOutImage) return 'Missing clock-out image.';
    return 'Attendance image is incomplete.';
  }

  private resolveAttendanceStatus(timeIn: Date | null, timeOut: Date | null, lateMinutes: number) {
    if (!timeIn && timeOut) return 'No Time In';
    if (timeIn && !timeOut) return 'No Time Out';
    if (!timeIn && !timeOut) return 'No Time In';
    if (lateMinutes > 0) return 'Late';
    return 'On Time';
  }

  private computeLateMinutes(timeIn: Date | null, scheduleStart: Date | undefined) {
    if (!timeIn || !scheduleStart) return 0;
    return Math.max(0, Math.floor((timeIn.getTime() - scheduleStart.getTime()) / 60_000));
  }

  private computeWorkedHours(
    timeIn: Date | null,
    timeOut: Date | null,
    breakStart: Date | null,
    breakEnd: Date | null,
  ) {
    if (!timeIn || !timeOut) return 0;
    let workedMinutes = Math.max(0, Math.floor((timeOut.getTime() - timeIn.getTime()) / 60_000));

    if (breakStart && breakEnd) {
      const overlapStart = Math.max(breakStart.getTime(), timeIn.getTime());
      const overlapEnd = Math.min(breakEnd.getTime(), timeOut.getTime());
      if (overlapEnd > overlapStart) {
        workedMinutes -= Math.floor((overlapEnd - overlapStart) / 60_000);
      }
    }

    return Math.max(0, Math.round((workedMinutes / 60) * 100) / 100);
  }

  private resolveAgingBucket(daysOutstanding: number) {
    if (daysOutstanding <= 30) return '0-30';
    if (daysOutstanding <= 60) return '31-60';
    if (daysOutstanding <= 90) return '61-90';
    return '90+';
  }

  private dayEmployeeKey(employeeId: number, dayKey: string) {
    return `${employeeId}:${dayKey}`;
  }

  private toManilaDayKey(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private toManilaMonthKey(value: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value || '1970';
    const month = parts.find((part) => part.type === 'month')?.value || '01';
    return `${year}-${month}`;
  }

  private buildDayKeys(start: Date, endExclusive: Date) {
    const keys: string[] = [];
    for (let cursor = start.getTime(); cursor < endExclusive.getTime(); cursor += MANILA_DAY_MS) {
      keys.push(this.toManilaDayKey(new Date(cursor)));
    }
    return keys;
  }

  private toManilaRange(from?: string, to?: string) {
    const currentManila = this.currentManilaDate();
    const defaultFrom = `${currentManila.year}-${String(currentManila.month).padStart(2, '0')}-01`;
    const defaultTo = `${currentManila.year}-${String(currentManila.month).padStart(2, '0')}-${String(currentManila.day).padStart(2, '0')}`;

    const fromValue = from && from.trim() ? from.trim() : defaultFrom;
    const toValue = to && to.trim() ? to.trim() : defaultTo;

    const start = this.parseManilaDayInput(fromValue, 'from');
    const endDay = this.parseManilaDayInput(toValue, 'to');
    if (endDay < start) {
      throw new BadRequestException('to must be on or after from.');
    }

    return {
      from: fromValue,
      to: toValue,
      start,
      endDay,
      endExclusive: new Date(endDay.getTime() + MANILA_DAY_MS),
    };
  }

  private parseManilaDayInput(value: string, fieldName: string) {
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException(`${fieldName} must use YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${trimmed}T00:00:00+08:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }
    return parsed;
  }

  private currentManilaDate(reference = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(reference);

    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return { year, month, day };
    }

    const fallback = new Date(reference.getTime() + MANILA_OFFSET_MINUTES * 60_000);
    return {
      year: fallback.getUTCFullYear(),
      month: fallback.getUTCMonth() + 1,
      day: fallback.getUTCDate(),
    };
  }
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
