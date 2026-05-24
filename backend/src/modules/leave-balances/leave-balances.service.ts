import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveBalanceDto } from './dto/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';

type LeaveBucket = {
  total: number;
  used: number;
  remaining: number;
};

@Injectable()
export class LeaveBalancesService {
  constructor(private readonly prisma: PrismaService) {}

  private canonicalLeaveType(value?: string | null) {
    const trimmed = String(value || '').trim();
    const normalized = trimmed.replace(/[\s_-]+/g, '').toUpperCase();

    if (['VACATION', 'VACATIONLEAVE', 'VL'].includes(normalized)) return 'Vacation';
    if (['SICK', 'SICKLEAVE', 'SL'].includes(normalized)) return 'Sick';
    return trimmed;
  }

  private leaveTypeAliases(canonicalLeaveType: 'Vacation' | 'Sick') {
    if (canonicalLeaveType === 'Vacation') return ['Vacation', 'VACATION', 'VL', 'Vacation Leave'];
    return ['Sick', 'SICK', 'SL', 'Sick Leave'];
  }

  private toLeaveBucket(total = 0, used = 0): LeaveBucket {
    const safeTotal = Math.max(0, total);
    const safeUsed = Math.max(0, used);
    return {
      total: safeTotal,
      used: safeUsed,
      remaining: Math.max(0, safeTotal - safeUsed),
    };
  }

  private summarizeEmployeeLeaveBalance(
    employee: {
      id: number;
      employeeCode: string;
      firstName: string;
      lastName: string;
      leaveBalances: Array<{
        leaveType: string;
        totalLeaves: number;
        usedLeaves: number;
      }>;
    },
  ) {
    let vacation = this.toLeaveBucket(0, 0);
    let sick = this.toLeaveBucket(0, 0);

    for (const balance of employee.leaveBalances) {
      const canonical = this.canonicalLeaveType(balance.leaveType);
      if (canonical === 'Vacation') {
        vacation = this.toLeaveBucket(
          vacation.total + balance.totalLeaves,
          vacation.used + balance.usedLeaves,
        );
      } else if (canonical === 'Sick') {
        sick = this.toLeaveBucket(sick.total + balance.totalLeaves, sick.used + balance.usedLeaves);
      }
    }

    const fullName = `${employee.firstName} ${employee.lastName}`.trim();
    return {
      id: employee.id,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      fullName,
      employee_id: employee.id,
      employee_code: employee.employeeCode,
      full_name: fullName,
      VL: vacation,
      SL: sick,
      vacationTotal: vacation.total,
      vacationUsed: vacation.used,
      sickTotal: sick.total,
      sickUsed: sick.used,
    };
  }

  private parseCanonicalBalanceType(value?: string) {
    const canonical = this.canonicalLeaveType(value);
    if (canonical === 'Vacation' || canonical === 'Sick') {
      return canonical;
    }
    throw new BadRequestException('leaveType must be Vacation or Sick.');
  }

  private async findBalanceRecordForType(employeeId: number, canonicalType: 'Vacation' | 'Sick') {
    const aliases = this.leaveTypeAliases(canonicalType);
    return this.prisma.employeeLeaveBalance.findFirst({
      where: {
        employeeId,
        OR: aliases.map((alias) => ({
          leaveType: { equals: alias, mode: 'insensitive' as const },
        })),
      },
    });
  }

  private async upsertCanonicalBalance(params: {
    employeeId: number;
    leaveType: 'Vacation' | 'Sick';
    totalLeaves?: number;
    usedLeaves?: number;
  }) {
    const existing = await this.findBalanceRecordForType(params.employeeId, params.leaveType);
    const totalLeaves = params.totalLeaves ?? existing?.totalLeaves ?? 0;
    const usedLeaves = params.usedLeaves ?? existing?.usedLeaves ?? 0;

    if (usedLeaves > totalLeaves) {
      throw new BadRequestException(`Used leaves cannot be greater than total leaves for ${params.leaveType}.`);
    }

    const remainingLeaves = totalLeaves - usedLeaves;

    if (!existing) {
      return this.prisma.employeeLeaveBalance.create({
        data: {
          employeeId: params.employeeId,
          leaveType: params.leaveType,
          totalLeaves,
          usedLeaves,
          remainingLeaves,
        },
      });
    }

    return this.prisma.employeeLeaveBalance.update({
      where: { id: existing.id },
      data: {
        leaveType: params.leaveType,
        totalLeaves,
        usedLeaves,
        remainingLeaves,
      },
    });
  }

  private async assertEmployeeExists(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
  }

  async findAll() {
    const rows = await this.prisma.employee.findMany({
      where: {
        leaveBalances: {
          some: {},
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        leaveBalances: {
          select: {
            leaveType: true,
            totalLeaves: true,
            usedLeaves: true,
          },
        },
      },
    });

    return rows.map((row) => this.summarizeEmployeeLeaveBalance(row));
  }

  async findOne(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        leaveBalances: {
          select: {
            leaveType: true,
            totalLeaves: true,
            usedLeaves: true,
          },
        },
      },
    });

    if (!employee || employee.leaveBalances.length === 0) {
      throw new NotFoundException('Leave balance not found for this employee');
    }

    return this.summarizeEmployeeLeaveBalance(employee);
  }

  async employeesWithLeaveBalance() {
    return this.prisma.employee.findMany({
      where: {
        leaveBalances: {
          some: {},
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        store: true,
      },
    });
  }

  async employeesWithoutLeaveBalance() {
    return this.prisma.employee.findMany({
      where: {
        leaveBalances: {
          none: {},
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        store: true,
      },
    });
  }

  async create(dto: CreateLeaveBalanceDto) {
    await this.assertEmployeeExists(dto.employeeId);

    if (dto.leaveType) {
      const canonical = this.parseCanonicalBalanceType(dto.leaveType);
      await this.upsertCanonicalBalance({
        employeeId: dto.employeeId,
        leaveType: canonical,
        totalLeaves: dto.totalLeaves,
        usedLeaves: dto.usedLeaves,
      });
      return this.findOne(dto.employeeId);
    }

    const hasVacation = dto.vacationTotal !== undefined || dto.vacationUsed !== undefined;
    const hasSick = dto.sickTotal !== undefined || dto.sickUsed !== undefined;
    if (!hasVacation && !hasSick) {
      throw new BadRequestException('Provide leaveType fields or vacation/sick totals.');
    }

    if (hasVacation) {
      await this.upsertCanonicalBalance({
        employeeId: dto.employeeId,
        leaveType: 'Vacation',
        totalLeaves: dto.vacationTotal,
        usedLeaves: dto.vacationUsed,
      });
    }

    if (hasSick) {
      await this.upsertCanonicalBalance({
        employeeId: dto.employeeId,
        leaveType: 'Sick',
        totalLeaves: dto.sickTotal,
        usedLeaves: dto.sickUsed,
      });
    }

    return this.findOne(dto.employeeId);
  }

  async update(employeeId: number, dto: UpdateLeaveBalanceDto) {
    await this.assertEmployeeExists(employeeId);

    if (dto.employeeId !== undefined && dto.employeeId !== employeeId) {
      throw new BadRequestException('employeeId in payload must match the route employeeId.');
    }

    if (dto.leaveType) {
      const canonical = this.parseCanonicalBalanceType(dto.leaveType);
      await this.upsertCanonicalBalance({
        employeeId,
        leaveType: canonical,
        totalLeaves: dto.totalLeaves,
        usedLeaves: dto.usedLeaves,
      });
      return this.findOne(employeeId);
    }

    const hasVacation = dto.vacationTotal !== undefined || dto.vacationUsed !== undefined;
    const hasSick = dto.sickTotal !== undefined || dto.sickUsed !== undefined;
    if (!hasVacation && !hasSick) {
      throw new BadRequestException('No leave balance changes were provided.');
    }

    if (hasVacation) {
      await this.upsertCanonicalBalance({
        employeeId,
        leaveType: 'Vacation',
        totalLeaves: dto.vacationTotal,
        usedLeaves: dto.vacationUsed,
      });
    }

    if (hasSick) {
      await this.upsertCanonicalBalance({
        employeeId,
        leaveType: 'Sick',
        totalLeaves: dto.sickTotal,
        usedLeaves: dto.sickUsed,
      });
    }

    return this.findOne(employeeId);
  }

  async remove(employeeId: number) {
    await this.assertEmployeeExists(employeeId);
    await this.prisma.employeeLeaveBalance.deleteMany({ where: { employeeId } });
    return { success: true };
  }

  async applyApprovedLeave(employeeId: number, leaveType: string, duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('Leave duration must be greater than zero.');
    }

    const canonicalType = this.canonicalLeaveType(leaveType);
    if (canonicalType !== 'Vacation' && canonicalType !== 'Sick') {
      return null;
    }

    const balance = await this.findBalanceRecordForType(employeeId, canonicalType);
    if (!balance) {
      throw new BadRequestException(`No ${canonicalType} leave balance found for this employee.`);
    }

    const usedLeaves = balance.usedLeaves + duration;
    const remainingLeaves = balance.totalLeaves - usedLeaves;

    if (remainingLeaves < 0) {
      throw new BadRequestException(`Insufficient ${canonicalType} leave balance.`);
    }

    return this.prisma.employeeLeaveBalance.update({
      where: { id: balance.id },
      data: {
        leaveType: canonicalType,
        usedLeaves,
        remainingLeaves,
      },
    });
  }
}
