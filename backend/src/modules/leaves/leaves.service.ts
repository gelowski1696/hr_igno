import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveStatus } from '@prisma/client';
import { LeaveBalancesService } from '../leave-balances/leave-balances.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalances: LeaveBalancesService,
  ) {}

  private normalizeStatus(value?: string | null) {
    const normalized = String(value || '').trim().toUpperCase();
    if (!normalized) return LeaveStatus.PENDING;
    if (normalized === 'PENDING') return LeaveStatus.PENDING;
    if (normalized === 'APPROVED' || normalized === 'APPROVE') return LeaveStatus.APPROVED;
    if (normalized === 'REJECTED' || normalized === 'REJECT') return LeaveStatus.REJECTED;
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return LeaveStatus.CANCELLED;
    throw new BadRequestException('Invalid leave status.');
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date.`);
    }
    return parsed;
  }

  private inclusiveDurationDays(startDate: Date, endDate: Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      throw new BadRequestException('endDate cannot be earlier than startDate.');
    }

    const days = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (days <= 0) {
      throw new BadRequestException('duration must be greater than zero.');
    }
    return days;
  }

  private shouldDeductLeaveBalance(leaveType: string) {
    const normalized = String(leaveType || '').trim().toUpperCase();
    return !['LWOP', 'HALFAM', 'HALFPM'].includes(normalized);
  }

  async create(dto: CreateLeaveDto) {
    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    const status = this.normalizeStatus(dto.status);
    const duration = dto.duration ?? this.inclusiveDurationDays(startDate, endDate);

    const leave = await this.prisma.employeeLeave.create({
      data: {
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        startDate,
        endDate,
        duration,
        status,
        reason: dto.reason,
        leaveRate: dto.leaveRate,
        approvedBy: dto.approvedBy,
      },
      include: { employee: true },
    });

    if (leave.status === LeaveStatus.APPROVED && this.shouldDeductLeaveBalance(leave.leaveType)) {
      await this.leaveBalances.applyApprovedLeave(leave.employeeId, leave.leaveType, leave.duration);
    }

    return leave;
  }

  findAll() {
    return this.prisma.employeeLeave.findMany({ orderBy: { createdAt: 'desc' }, include: { employee: true } });
  }

  findByEmployee(employeeId: number) {
    return this.prisma.employeeLeave.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { employee: true },
    });
  }

  async findPendingRequests() {
    const leaves = await this.prisma.employeeLeave.findMany({
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      where: { status: LeaveStatus.PENDING },
      orderBy: {
        startDate: 'desc',
      },
    });

    return leaves.map((leave) => ({
      id: leave.employee.employeeCode,
      name: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
      leaveType: leave.leaveType,
      leaveFrom: leave.startDate,
      leaveTo: leave.endDate,
      days: leave.duration,
      reason: leave.reason,
      status: leave.status,
    }));
  }

  async findOne(id: number) {
    const leave = await this.prisma.employeeLeave.findUnique({ where: { id }, include: { employee: true } });
    if (!leave) throw new NotFoundException('Leave request not found');
    return leave;
  }

  async update(id: number, dto: UpdateLeaveDto) {
    const existing = await this.prisma.employeeLeave.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');

    const startDate = dto.startDate ? this.parseDate(dto.startDate, 'startDate') : existing.startDate;
    const endDate = dto.endDate ? this.parseDate(dto.endDate, 'endDate') : existing.endDate;
    const duration = dto.duration ?? this.inclusiveDurationDays(startDate, endDate);
    const status = dto.status ? this.normalizeStatus(dto.status) : existing.status;
    const leaveType = dto.leaveType ?? existing.leaveType;

    if (existing.status === LeaveStatus.APPROVED && status !== LeaveStatus.APPROVED) {
      throw new BadRequestException('Approved leave status cannot be changed.');
    }

    if (
      existing.status === LeaveStatus.APPROVED &&
      (duration !== existing.duration || leaveType !== existing.leaveType)
    ) {
      throw new BadRequestException('Approved leave duration/type cannot be modified.');
    }

    const leave = await this.prisma.employeeLeave.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        leaveType,
        startDate,
        endDate,
        duration,
        status,
        reason: dto.reason,
        leaveRate: dto.leaveRate,
        approvedBy: dto.approvedBy,
      },
      include: { employee: true },
    });

    if (
      existing.status !== LeaveStatus.APPROVED &&
      leave.status === LeaveStatus.APPROVED &&
      this.shouldDeductLeaveBalance(leave.leaveType)
    ) {
      await this.leaveBalances.applyApprovedLeave(leave.employeeId, leave.leaveType, leave.duration);
    }

    return leave;
  }

  async approve(id: number, approvedBy: string) {
    const existing = await this.prisma.employeeLeave.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');

    if (existing.status === LeaveStatus.APPROVED) {
      return this.prisma.employeeLeave.findUnique({ where: { id }, include: { employee: true } });
    }

    const leave = await this.prisma.employeeLeave.update({
      where: { id },
      data: { status: LeaveStatus.APPROVED, approvedBy },
      include: { employee: true },
    });

    if (this.shouldDeductLeaveBalance(leave.leaveType)) {
      await this.leaveBalances.applyApprovedLeave(leave.employeeId, leave.leaveType, leave.duration);
    }

    return leave;
  }

  reject(id: number, approvedBy: string) {
    return this.prisma.employeeLeave.update({
      where: { id },
      data: { status: LeaveStatus.REJECTED, approvedBy },
    });
  }

  async remove(id: number) {
    const leave = await this.prisma.employeeLeave.findUnique({ where: { id }, select: { status: true } });
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Approved leave cannot be deleted.');
    }

    await this.prisma.employeeLeave.delete({ where: { id } });
    return { success: true };
  }
}
