import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus, PaymentStatus, PayrollStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkGeneratePayrollDto } from './dto/bulk-generate-payroll.dto';
import { CreatePayrollDto, type PayrollSelectedPaymentDto } from './dto/create-payroll.dto';
import { PayrollPreviewDto } from './dto/payroll-preview.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';

const MANILA_DAY_MS = 24 * 60 * 60 * 1000;
const MANILA_OFFSET_MINUTES = 8 * 60;

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMinutesToClock(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  private findNumber(...values: unknown[]) {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private findString(...values: unknown[]) {
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return undefined;
  }

  private parseIsoDate(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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

  private getManilaDayStart(reference = new Date()) {
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
      return new Date(
        Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate()) - MANILA_OFFSET_MINUTES * 60_000,
      );
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - MANILA_OFFSET_MINUTES * 60_000);
  }

  private toManilaDayKey(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private toManilaRange(startDate: string, endDate: string) {
    const start = this.parseManilaDayInput(startDate, 'startDate');
    const endDay = this.parseManilaDayInput(endDate, 'endDate');
    if (endDay < start) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }
    const endExclusive = new Date(endDay.getTime() + MANILA_DAY_MS);
    return { start, endDay, endExclusive };
  }

  private normalizeStatus(value?: string, fallback: PayrollStatus = PayrollStatus.DRAFT) {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (!normalized) return fallback;
    if (normalized === 'DRAFT' || normalized === 'PENDING') return PayrollStatus.DRAFT;
    if (normalized === 'PREVIEWED' || normalized === 'PREVIEW') return PayrollStatus.PREVIEWED;
    if (normalized === 'RELEASED') return PayrollStatus.RELEASED;
    if (normalized === 'VOIDED' || normalized === 'VOID') return PayrollStatus.VOIDED;
    return fallback;
  }

  private resolveEmployeeId(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.findNumber(dto.employeeId, dto.employee_id);
  }

  private resolvePayrollDate(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.parseIsoDate(this.findString(dto.payrollDate, dto.payroll_date)) || new Date();
  }

  private resolvePayrollFrom(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.parseIsoDate(this.findString(dto.payrollFrom, dto.payroll_from));
  }

  private resolvePayrollTo(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.parseIsoDate(this.findString(dto.payrollTo, dto.payroll_to));
  }

  private resolvePayMethod(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.findString(dto.payMethod, dto.paymethod);
  }

  private resolveCreatedBy(dto: CreatePayrollDto | UpdatePayrollDto) {
    return this.findString(dto.createdBy, dto.createby);
  }

  private parseIdList(...sources: Array<number[] | undefined>) {
    const set = new Set<number>();
    for (const source of sources) {
      for (const value of source || []) {
        if (Number.isInteger(value) && value > 0) {
          set.add(value);
        }
      }
    }
    return Array.from(set);
  }

  private resolveComputedFields(dto: CreatePayrollDto | UpdatePayrollDto) {
    const daysOfWork = toNumber(this.findNumber(dto.daysOfWork, dto.days_of_work), 0);
    const rate = toNumber(dto.rate, 0);
    const totalRegularWage = toNumber(this.findNumber(dto.totalRegularWage, dto.total_regular_wage), round2(daysOfWork * rate));

    const overtimeHours = toNumber(this.findNumber(dto.overtimeHours, dto.overtime_hours), 0);
    const lateHours = toNumber(this.findNumber(dto.lateHours, dto.late_hours), 0);
    const overtimeAmount = toNumber(this.findNumber(dto.overtimeAmount, dto.overtime_amount), 0);
    const lateAmount = toNumber(this.findNumber(dto.lateAmount, dto.late_amount), 0);
    const allowance = toNumber(dto.allowance, 0);
    const addOnHoliday = toNumber(this.findNumber(dto.addOnHoliday, dto.add_on_holiday), 0);
    const sssDeduction = toNumber(this.findNumber(dto.sssDeduction, dto.sss_deduction), 0);
    const philhealthDeduction = toNumber(this.findNumber(dto.philhealthDeduction, dto.philhealth_deduction), 0);
    const pagibigDeduction = toNumber(this.findNumber(dto.pagibigDeduction, dto.pagibig_deduction), 0);
    const valeDeduction = toNumber(this.findNumber(dto.valeDeduction, dto.vale_deduction), 0);
    const loanDeduction = toNumber(this.findNumber(dto.loanDeduction, dto.loan_deduction), 0);
    const sssLoan = toNumber(this.findNumber(dto.sssLoan, dto.sssloan), 0);
    const pagibigLoan = toNumber(this.findNumber(dto.pagibigLoan, dto.pagibigloan), 0);
    const philhealthLoan = toNumber(this.findNumber(dto.philhealthLoan, dto.philhealthloan), 0);
    const penaltyOrUndertime = toNumber(this.findNumber(dto.penaltyOrUndertime, dto.penalty_or_undertime), 0);
    const penaltyRate = toNumber(this.findNumber(dto.penaltyRate, dto.penalty_rate), 0);
    const bonusRate = toNumber(this.findNumber(dto.bonusRate, dto.bonus_rate), 0);
    const pondo = toNumber(dto.pondo, 0);
    const charge = toNumber(dto.charge, 0);
    const credit = toNumber(dto.credit, 0);
    const endingFund = toNumber(this.findNumber(dto.endingFund, dto.ending_fund), 0);

    const totalAllowance = round2(sssDeduction + philhealthDeduction + pagibigDeduction);
    const otherDeduction = round2(
      penaltyRate +
        pondo +
        penaltyOrUndertime +
        lateAmount +
        sssLoan +
        pagibigLoan +
        philhealthLoan +
        valeDeduction +
        loanDeduction,
    );
    const totalAmount = round2(totalRegularWage + overtimeAmount + addOnHoliday + bonusRate + allowance);
    const netAmountPaid = round2(totalAmount + credit - (totalAllowance + otherDeduction + charge));

    return {
      daysOfWork,
      rate,
      totalRegularWage,
      overtimeHours,
      lateHours,
      overtimeAmount,
      lateAmount,
      allowance,
      totalAllowance,
      addOnHoliday,
      totalAmount,
      sssDeduction,
      philhealthDeduction,
      pagibigDeduction,
      valeDeduction,
      charge,
      credit,
      loanDeduction,
      penaltyOrUndertime,
      sssLoan,
      pagibigLoan,
      philhealthLoan,
      pondo,
      endingFund,
      netAmountPaid,
      penaltyRate,
      penaltyRemarks: this.findString(dto.penaltyRemarks, dto.penalty_remarks),
      bonusRate,
      bonusRemarks: this.findString(dto.bonusRemarks, dto.bonus_remarks),
      otherDeduction,
    };
  }

  private normalizeSelectedPayments(raw: PayrollSelectedPaymentDto[] | undefined, fallbackDate: Date) {
    if (!Array.isArray(raw) || raw.length === 0) return [];

    return raw
      .map((payment) => {
        const amount = toNumber(payment.amount, 0);
        if (amount <= 0) return null;
        const paymentDate = this.parseIsoDate(payment.date) || fallbackDate;
        const cashAdvanceId = this.findNumber(payment.cashAdvanceId, payment.cash_advance_id);
        const installmentPlan = this.findNumber(payment.installmentPlan, payment.installment_plan);
        return {
          type: this.findString(payment.type) || 'Loan',
          date: paymentDate,
          amount: round2(amount),
          cashAdvanceId: cashAdvanceId && cashAdvanceId > 0 ? Math.trunc(cashAdvanceId) : undefined,
          installmentPlan: installmentPlan && installmentPlan > 0 ? Math.trunc(installmentPlan) : 1,
        };
      })
      .filter((payment): payment is NonNullable<typeof payment> => Boolean(payment));
  }

  create(dto: CreatePayrollDto) {
    const employeeId = this.resolveEmployeeId(dto);
    if (!employeeId || employeeId <= 0) {
      throw new BadRequestException('employeeId is required.');
    }

    const payrollDate = this.resolvePayrollDate(dto);
    const computed = this.resolveComputedFields(dto);
    const selectedPayments = this.normalizeSelectedPayments(dto.selectedPayments, payrollDate);

    return this.prisma.payroll.create({
      data: {
        employeeId,
        ...computed,
        payrollDate,
        payrollFrom: this.resolvePayrollFrom(dto),
        payrollTo: this.resolvePayrollTo(dto),
        payMethod: this.resolvePayMethod(dto),
        createdBy: this.resolveCreatedBy(dto),
        status: this.normalizeStatus(dto.status, PayrollStatus.DRAFT),
        selectedPayments: selectedPayments.length
          ? {
              create: selectedPayments,
            }
          : undefined,
      },
      include: {
        employee: { include: { store: true } },
        selectedPayments: true,
        disputes: true,
      },
    });
  }

  findAll(filters?: { from?: string; to?: string }) {
    const from = this.parseIsoDate(filters?.from);
    const to = this.parseIsoDate(filters?.to);
    const toExclusive = to ? new Date(to.getTime() + MANILA_DAY_MS) : undefined;
    const where: Prisma.PayrollWhereInput = {};

    if (from || toExclusive) {
      const andFilters: Prisma.PayrollWhereInput[] = [];

      if (from) {
        // Overlap logic: run must end on/after the filter start.
        andFilters.push({
          OR: [
            { payrollTo: { gte: from } },
            { payrollTo: null, payrollDate: { gte: from } },
          ],
        });
      }

      if (toExclusive) {
        // Overlap logic: run must start before the day after filter end.
        andFilters.push({
          OR: [
            { payrollFrom: { lt: toExclusive } },
            { payrollFrom: null, payrollDate: { lt: toExclusive } },
          ],
        });
      }

      if (andFilters.length) {
        where.AND = andFilters;
      }
    }

    return this.prisma.payroll.findMany({
      where,
      orderBy: { payrollDate: 'desc' },
      include: {
        employee: { include: { store: true } },
        selectedPayments: true,
        disputes: true,
      },
    });
  }

  findByEmployee(employeeId: number, filters?: { from?: string; to?: string }) {
    const from = this.parseIsoDate(filters?.from);
    const to = this.parseIsoDate(filters?.to);
    const toExclusive = to ? new Date(to.getTime() + MANILA_DAY_MS) : undefined;
    const where: Prisma.PayrollWhereInput = { employeeId };

    if (from || toExclusive) {
      const andFilters: Prisma.PayrollWhereInput[] = [];

      if (from) {
        andFilters.push({
          OR: [
            { payrollTo: { gte: from } },
            { payrollTo: null, payrollDate: { gte: from } },
          ],
        });
      }

      if (toExclusive) {
        andFilters.push({
          OR: [
            { payrollFrom: { lt: toExclusive } },
            { payrollFrom: null, payrollDate: { lt: toExclusive } },
          ],
        });
      }

      if (andFilters.length) {
        where.AND = andFilters;
      }
    }

    return this.prisma.payroll.findMany({
      where,
      orderBy: { payrollDate: 'desc' },
      include: {
        employee: { include: { store: true } },
        selectedPayments: true,
        disputes: true,
      },
    });
  }

  async findOne(id: number) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: { include: { store: true } },
        selectedPayments: true,
        disputes: true,
      },
    });
    if (!payroll) throw new NotFoundException('Payroll not found');
    return payroll;
  }

  async preview(dto: PayrollPreviewDto) {
    const { start, endDay, endExclusive } = this.toManilaRange(dto.startDate, dto.endDate);

    const employeeIds = new Set<number>();
    for (const value of dto.employeeIds || []) {
      if (Number.isInteger(value) && value > 0) employeeIds.add(value);
    }
    for (const value of dto.employee_ids || []) {
      if (Number.isInteger(value) && value > 0) employeeIds.add(value);
    }
    if (dto.employeeId && Number.isInteger(dto.employeeId) && dto.employeeId > 0) {
      employeeIds.add(dto.employeeId);
    }

    if (!employeeIds.size) {
      throw new BadRequestException('At least one employee ID is required.');
    }

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: Array.from(employeeIds) } },
      include: {
        store: true,
        workSchedules: {
          where: {
            workSchedule: {
              status: { in: ['ACTIVE', 'Active', 'active'] },
              startTime: { gte: start, lt: endExclusive },
            },
          },
          include: { workSchedule: true },
        },
        timeRecords: {
          where: {
            OR: [
              { timeIn: { gte: start, lt: endExclusive } },
              { createdAt: { gte: start, lt: endExclusive } },
            ],
          },
          orderBy: { createdAt: 'asc' },
        },
        leaves: {
          where: {
            status: LeaveStatus.APPROVED,
            startDate: { lte: new Date(endExclusive.getTime() - 1) },
            endDate: { gte: start },
          },
        },
        cashAdvances: {
          where: {
            status: { in: [PaymentStatus.APPROVED, PaymentStatus.PARTIAL] },
            balance: { gt: 0 },
          },
          orderBy: { dateIssued: 'desc' },
        },
      },
    });

    const orderedEmployees = employees.sort((left, right) => left.employeeCode.localeCompare(right.employeeCode));
    const dayKeys: string[] = [];
    for (let cursor = new Date(start); cursor < endExclusive; cursor = new Date(cursor.getTime() + MANILA_DAY_MS)) {
      dayKeys.push(this.toManilaDayKey(cursor));
    }

    return orderedEmployees.map((employee) => {
      const schedulesByDay = new Map<string, Array<(typeof employee.workSchedules)[number]['workSchedule']>>();
      for (const assignment of employee.workSchedules) {
        const schedule = assignment.workSchedule;
        const key = this.toManilaDayKey(schedule.startTime);
        const bucket = schedulesByDay.get(key) || [];
        bucket.push(schedule);
        schedulesByDay.set(key, bucket);
      }
      for (const [key, schedules] of schedulesByDay.entries()) {
        schedules.sort((left, right) => left.startTime.getTime() - right.startTime.getTime());
        schedulesByDay.set(key, schedules);
      }

      const recordsByDay = new Map<string, typeof employee.timeRecords>();
      for (const record of employee.timeRecords) {
        const reference = record.timeIn || record.createdAt;
        const key = this.toManilaDayKey(reference);
        const bucket = recordsByDay.get(key) || [];
        bucket.push(record);
        recordsByDay.set(key, bucket);
      }
      for (const [key, records] of recordsByDay.entries()) {
        records.sort((left, right) => {
          const leftTime = (left.timeIn || left.createdAt).getTime();
          const rightTime = (right.timeIn || right.createdAt).getTime();
          return leftTime - rightTime;
        });
        recordsByDay.set(key, records);
      }

      let totalWorkMinutes = 0;
      let totalOvertimeMinutes = 0;
      let totalUndertimeMinutes = 0;
      let totalLateMinutes = 0;
      let totalNoTimeout = 0;
      let totalLeaveRate = 0;
      const workedDayKeys = new Set<string>();

      const hoursWorked: Array<{ date: string; hours: string }> = [];
      const overtime: Array<{ date: string; overtime: string }> = [];
      const undertime: Array<{ date: string; undertime: string }> = [];
      const lateHours: Array<{ date: string; late: string }> = [];
      const noTimeoutHours: Array<{ date: string; hours: string; timeRecordId: number }> = [];
      const leaveRows: Array<{ date: string; leaveType: string; leaveRate: number }> = [];

      for (const dayKey of dayKeys) {
        const dayStart = this.parseManilaDayInput(dayKey, 'day');
        const dayEndExclusive = new Date(dayStart.getTime() + MANILA_DAY_MS);
        const leave = employee.leaves.find(
          (item) => item.startDate < dayEndExclusive && item.endDate >= dayStart,
        );
        if (leave) {
          const leaveRate = toNumber(leave.leaveRate, 0);
          leaveRows.push({
            date: dayKey,
            leaveType: leave.leaveType,
            leaveRate,
          });
          totalLeaveRate += leaveRate;
          continue;
        }

        const schedule = (schedulesByDay.get(dayKey) || [])[0];
        const record = (recordsByDay.get(dayKey) || [])[0];
        if (!record || !record.timeIn) {
          continue;
        }

        const timeIn = record.timeIn;
        const timeOut = record.timeOut;

        // Fallback path: no schedule assignment for the day.
        // We still count worked day/hours from time records so payroll generation remains usable.
        if (!schedule) {
          if (!timeOut) {
            totalNoTimeout += 1;
            noTimeoutHours.push({ date: dayKey, hours: '00:00', timeRecordId: record.id });
            continue;
          }

          const workedMinutes = Math.max(0, Math.floor((timeOut.getTime() - timeIn.getTime()) / 60_000));
          totalWorkMinutes += workedMinutes;
          workedDayKeys.add(dayKey);
          hoursWorked.push({ date: dayKey, hours: formatMinutesToClock(workedMinutes) });
          continue;
        }

        const scheduleStart = schedule.startTime;
        const scheduleEnd = schedule.endTime;

        if (timeIn > scheduleStart) {
          const lateMinutes = Math.max(0, Math.floor((timeIn.getTime() - scheduleStart.getTime()) / 60_000));
          totalLateMinutes += lateMinutes;
          lateHours.push({ date: dayKey, late: formatMinutesToClock(lateMinutes) });
        }

        if (!timeOut) {
          totalNoTimeout += 1;
          noTimeoutHours.push({ date: dayKey, hours: '00:00', timeRecordId: record.id });
          continue;
        }

        let workedMinutes = Math.max(0, Math.floor((timeOut.getTime() - timeIn.getTime()) / 60_000));
        if (schedule.breakStart && schedule.breakEnd) {
          const overlapStart = Math.max(schedule.breakStart.getTime(), timeIn.getTime());
          const overlapEnd = Math.min(schedule.breakEnd.getTime(), timeOut.getTime());
          if (overlapEnd > overlapStart) {
            workedMinutes -= Math.floor((overlapEnd - overlapStart) / 60_000);
          }
        }
        workedMinutes = Math.max(0, workedMinutes);

        totalWorkMinutes += workedMinutes;
        workedDayKeys.add(dayKey);
        hoursWorked.push({ date: dayKey, hours: formatMinutesToClock(workedMinutes) });

        if (timeOut > scheduleEnd) {
          const overtimeMinutes = Math.max(0, Math.floor((timeOut.getTime() - scheduleEnd.getTime()) / 60_000));
          totalOvertimeMinutes += overtimeMinutes;
          overtime.push({ date: dayKey, overtime: formatMinutesToClock(overtimeMinutes) });
        } else if (timeOut < scheduleEnd) {
          const undertimeMinutes = Math.max(0, Math.floor((scheduleEnd.getTime() - timeOut.getTime()) / 60_000));
          totalUndertimeMinutes += undertimeMinutes;
          undertime.push({ date: dayKey, undertime: formatMinutesToClock(undertimeMinutes) });
        }
      }

      const cashadvance: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number }> = [];
      const loan: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }> = [];
      const sssloan: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }> = [];
      const pagibigloan: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }> = [];
      const philhealthloan: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }> = [];
      let totalCashAdvance = 0;
      let totalLoans = 0;
      let totalSssLoan = 0;
      let totalPagibigLoan = 0;
      let totalPhilhealthLoan = 0;

      for (const item of employee.cashAdvances) {
        const type = String(item.type || '').trim();
        const balance = toNumber(item.balance, 0);
        if (balance <= 0) continue;
        const issuedDate = item.dateIssued ? this.toManilaDayKey(item.dateIssued) : this.toManilaDayKey(new Date());
        const atd = item.atd || '';

        if (type === 'Cash Advance') {
          cashadvance.push({ type, date: issuedDate, atd, amount: balance, cashAdvanceId: item.id });
          totalCashAdvance += balance;
          continue;
        }
        if (type === 'Loan') {
          loan.push({
            type,
            date: issuedDate,
            atd,
            amount: balance,
            cashAdvanceId: item.id,
            installmentPlan: item.installmentPlan || 1,
          });
          totalLoans += balance;
          continue;
        }
        if (type === 'SSS Loan') {
          sssloan.push({
            type,
            date: issuedDate,
            atd,
            amount: balance,
            cashAdvanceId: item.id,
            installmentPlan: item.installmentPlan || 1,
          });
          totalSssLoan += balance;
          continue;
        }
        if (type === 'PAG-IBIG Loan') {
          pagibigloan.push({
            type,
            date: issuedDate,
            atd,
            amount: balance,
            cashAdvanceId: item.id,
            installmentPlan: item.installmentPlan || 1,
          });
          totalPagibigLoan += balance;
          continue;
        }
        if (type === 'PHILHEALTH Loan') {
          philhealthloan.push({
            type,
            date: issuedDate,
            atd,
            amount: balance,
            cashAdvanceId: item.id,
            installmentPlan: item.installmentPlan || 1,
          });
          totalPhilhealthLoan += balance;
          continue;
        }
      }

      const daysOfWork = workedDayKeys.size;
      const rate = toNumber(employee.salary, 0);
      const totalRegularWage = round2(daysOfWork * rate);
      const sssDeduction = toNumber(employee.sssContribution, 0);
      const philhealthDeduction = toNumber(employee.philhealthContribution, 0);
      const pagibigDeduction = toNumber(employee.pagibigContribution, 0);
      const addOnHoliday = round2(totalLeaveRate);
      const overtimeHours = round2(totalOvertimeMinutes / 60);
      const lateHoursValue = round2(totalLateMinutes / 60);

      const derived = this.resolveComputedFields({
        employeeId: employee.id,
        daysOfWork,
        rate,
        totalRegularWage,
        overtimeHours,
        lateHours: lateHoursValue,
        overtimeAmount: 0,
        lateAmount: 0,
        addOnHoliday,
        sssDeduction,
        philhealthDeduction,
        pagibigDeduction,
        valeDeduction: round2(totalCashAdvance),
        loanDeduction: round2(totalLoans),
        sssLoan: round2(totalSssLoan),
        pagibigLoan: round2(totalPagibigLoan),
        philhealthLoan: round2(totalPhilhealthLoan),
      });

      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        fullName: `${employee.firstName} ${employee.lastName}`.trim(),
        position: employee.position,
        storeArea: employee.store?.area || null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        totalDaysWorked: daysOfWork,
        totalNoTimeOut: totalNoTimeout,
        totalHoursWorked: formatMinutesToClock(totalWorkMinutes),
        totalOvertime: formatMinutesToClock(totalOvertimeMinutes),
        totalUndertime: formatMinutesToClock(totalUndertimeMinutes),
        totalLateHours: formatMinutesToClock(totalLateMinutes),
        totalLeaveRate: round2(totalLeaveRate),
        totalCashAdvance: round2(totalCashAdvance),
        totalLoans: round2(totalLoans),
        totalSssLoan: round2(totalSssLoan),
        totalPagibigLoan: round2(totalPagibigLoan),
        totalPhilhealthLoan: round2(totalPhilhealthLoan),
        salaryRate: rate,
        suggestions: {
          daysOfWork: derived.daysOfWork,
          rate: derived.rate,
          totalRegularWage: derived.totalRegularWage,
          overtimeHours: derived.overtimeHours,
          lateHours: derived.lateHours,
          overtimeAmount: derived.overtimeAmount,
          lateAmount: derived.lateAmount,
          addOnHoliday: derived.addOnHoliday,
          sssDeduction: derived.sssDeduction,
          philhealthDeduction: derived.philhealthDeduction,
          pagibigDeduction: derived.pagibigDeduction,
          valeDeduction: derived.valeDeduction,
          loanDeduction: derived.loanDeduction,
          sssLoan: derived.sssLoan,
          pagibigLoan: derived.pagibigLoan,
          philhealthLoan: derived.philhealthLoan,
          totalAllowance: derived.totalAllowance,
          otherDeduction: derived.otherDeduction,
          totalAmount: derived.totalAmount,
          netAmountPaid: derived.netAmountPaid,
        },
        hoursWorked,
        overtime,
        undertime,
        lateHours,
        noTimeoutHours,
        leaves: leaveRows,
        cashadvance,
        loan,
        sssloan,
        pagibigloan,
        philhealthloan,
      };
    });
  }

  async generateBulk(dto: BulkGeneratePayrollDto, actor: string) {
    const groupIds = this.parseIdList(dto.groupIds, dto.group_ids);
    const explicitEmployeeIds = this.parseIdList(dto.employeeIds, dto.employee_ids);
    const targetEmployeeIds = new Set<number>(explicitEmployeeIds);

    if (groupIds.length) {
      const memberships = await this.prisma.employeeGroupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { employeeId: true },
      });
      for (const membership of memberships) {
        if (membership.employeeId > 0) {
          targetEmployeeIds.add(membership.employeeId);
        }
      }
    }

    if (!targetEmployeeIds.size) {
      throw new BadRequestException('Select at least one employee or employee group.');
    }

    const employees = await this.prisma.employee.findMany({
      where: { id: { in: Array.from(targetEmployeeIds) } },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
    const existingEmployeeIds = new Set(employees.map((employee) => employee.id));
    const missingEmployeeIds = Array.from(targetEmployeeIds).filter((id) => !existingEmployeeIds.has(id));
    const scopedEmployeeIds = employees.map((employee) => employee.id);

    if (!scopedEmployeeIds.length) {
      throw new BadRequestException('No valid employees found for payroll generation.');
    }

    const previews = await this.preview({
      startDate: dto.startDate,
      endDate: dto.endDate,
      employeeIds: scopedEmployeeIds,
    });
    const previewByEmployeeId = new Map<number, (typeof previews)[number]>();
    for (const preview of previews) {
      previewByEmployeeId.set(preview.employeeId, preview);
    }

    const skipExisting = dto.skipExisting !== false;
    const { start, endDay } = this.toManilaRange(dto.startDate, dto.endDate);
    const status = this.normalizeStatus(dto.status, PayrollStatus.DRAFT);
    const payMethod = this.findString(dto.payMethod, dto.paymethod);
    const createdBy = this.findString(dto.createdBy, dto.createby, actor);
    const now = new Date();

    const existingRows = skipExisting
      ? await this.prisma.payroll.findMany({
          where: {
            employeeId: { in: scopedEmployeeIds },
            payrollFrom: start,
            payrollTo: endDay,
            status: { not: PayrollStatus.VOIDED },
          },
          select: { employeeId: true },
        })
      : [];
    const existingEmployeeSet = new Set(existingRows.map((row) => row.employeeId));

    const created: Array<{
      id: number;
      employeeId: number;
      employeeCode: string;
      fullName: string;
      status: PayrollStatus;
      netAmountPaid: number;
    }> = [];
    const skipped: Array<{ employeeId: number; employeeCode: string; fullName: string; reason: string }> = [];

    for (const employee of employees) {
      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      if (existingEmployeeSet.has(employee.id)) {
        skipped.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          fullName,
          reason: 'Payroll already exists for selected period.',
        });
        continue;
      }

      const preview = previewByEmployeeId.get(employee.id);
      if (!preview) {
        skipped.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          fullName,
          reason: 'No preview data available.',
        });
        continue;
      }

      const suggestions = preview.suggestions || ({} as (typeof preview)['suggestions']);
      const computed = this.resolveComputedFields({
        employeeId: employee.id,
        daysOfWork: suggestions.daysOfWork ?? preview.totalDaysWorked ?? 0,
        rate: suggestions.rate ?? 0,
        totalRegularWage: suggestions.totalRegularWage ?? 0,
        overtimeHours: suggestions.overtimeHours ?? 0,
        lateHours: suggestions.lateHours ?? 0,
        overtimeAmount: suggestions.overtimeAmount ?? 0,
        lateAmount: suggestions.lateAmount ?? 0,
        addOnHoliday: suggestions.addOnHoliday ?? preview.totalLeaveRate ?? 0,
        sssDeduction: suggestions.sssDeduction ?? 0,
        philhealthDeduction: suggestions.philhealthDeduction ?? 0,
        pagibigDeduction: suggestions.pagibigDeduction ?? 0,
        valeDeduction: suggestions.valeDeduction ?? preview.totalCashAdvance ?? 0,
        loanDeduction: suggestions.loanDeduction ?? preview.totalLoans ?? 0,
        sssLoan: suggestions.sssLoan ?? preview.totalSssLoan ?? 0,
        pagibigLoan: suggestions.pagibigLoan ?? preview.totalPagibigLoan ?? 0,
        philhealthLoan: suggestions.philhealthLoan ?? preview.totalPhilhealthLoan ?? 0,
        totalAllowance: suggestions.totalAllowance ?? 0,
        otherDeduction: suggestions.otherDeduction ?? 0,
        totalAmount: suggestions.totalAmount ?? 0,
        netAmountPaid: suggestions.netAmountPaid ?? 0,
      });

      const payroll = await this.prisma.payroll.create({
        data: {
          employeeId: employee.id,
          ...computed,
          payrollDate: now,
          payrollFrom: start,
          payrollTo: endDay,
          payMethod,
          createdBy,
          status,
        },
        select: {
          id: true,
          employeeId: true,
          status: true,
          netAmountPaid: true,
        },
      });

      created.push({
        id: payroll.id,
        employeeId: payroll.employeeId,
        employeeCode: employee.employeeCode,
        fullName,
        status: payroll.status,
        netAmountPaid: Number(payroll.netAmountPaid),
      });
    }

    return {
      period: {
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
      requestedEmployeeCount: targetEmployeeIds.size,
      processedEmployeeCount: employees.length,
      missingEmployeeIds,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    };
  }

  async update(id: number, dto: UpdatePayrollDto) {
    await this.findOne(id);
    const employeeId = this.resolveEmployeeId(dto);
    const payrollDate = this.resolvePayrollDate(dto);
    const computed = this.resolveComputedFields(dto);
    const selectedPayments = this.normalizeSelectedPayments(dto.selectedPayments, payrollDate);

    return this.prisma.payroll.update({
      where: { id },
      data: {
        employeeId: employeeId && employeeId > 0 ? employeeId : undefined,
        ...computed,
        payrollDate,
        payrollFrom: this.resolvePayrollFrom(dto),
        payrollTo: this.resolvePayrollTo(dto),
        payMethod: this.resolvePayMethod(dto),
        createdBy: this.resolveCreatedBy(dto),
        status: dto.status ? this.normalizeStatus(dto.status) : undefined,
        selectedPayments: dto.selectedPayments
          ? {
              deleteMany: {},
              create: selectedPayments,
            }
          : undefined,
      },
      include: {
        employee: { include: { store: true } },
        selectedPayments: true,
        disputes: true,
      },
    });
  }

  async release(id: number, releasedBy: string) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('Payroll not found');
    if (payroll.status === PayrollStatus.RELEASED) {
      throw new BadRequestException('Payroll is already released');
    }
    if (payroll.status === PayrollStatus.VOIDED) {
      throw new BadRequestException('Voided payroll cannot be released');
    }

    return this.prisma.payroll.update({
      where: { id },
      data: {
        status: PayrollStatus.RELEASED,
        createdBy: releasedBy,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.payroll.delete({ where: { id } });
    return { success: true };
  }
}
