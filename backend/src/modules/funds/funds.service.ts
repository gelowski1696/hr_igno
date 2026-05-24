import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdvancedSearchFundsDto } from './dto/advanced-search-funds.dto';
import { CheckAtdDto } from './dto/check-atd.dto';
import { CreateFundsLogDto } from './dto/create-funds-log.dto';
import { UpdateFundsLogDto } from './dto/update-funds-log.dto';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveEmployeeId(dto: CreateFundsLogDto | UpdateFundsLogDto) {
    return dto.employeeId ?? dto.employee_id;
  }

  private resolveCashBy(dto: CreateFundsLogDto | UpdateFundsLogDto) {
    return dto.cashBy ?? dto.cashby;
  }

  private resolvePaymentMethod(dto: CreateFundsLogDto | UpdateFundsLogDto) {
    return dto.paymentMethod ?? dto.payment_method;
  }

  private resolveCreatedAt(dto: CreateFundsLogDto | UpdateFundsLogDto) {
    return dto.createdAt ?? dto.created_at;
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return Number(value.toString());
  }

  private normalizeDate(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  async create(dto: CreateFundsLogDto) {
    const employeeId = this.resolveEmployeeId(dto);
    if (!employeeId) {
      throw new BadRequestException('employeeId is required.');
    }

    if (dto.atd) {
      const duplicate = await this.prisma.fundsLog.findFirst({
        where: { atd: dto.atd },
        select: { id: true },
      });
      if (duplicate) {
        throw new BadRequestException('ATD already exists.');
      }
    }

    return this.prisma.fundsLog.create({
      data: {
        employeeId,
        atd: dto.atd,
        action: dto.action,
        type: dto.type,
        amount: dto.amount,
        funds: dto.amount,
        encoder: dto.encoder || 'system',
        cashBy: this.resolveCashBy(dto),
        paymentMethod: this.resolvePaymentMethod(dto),
        status: dto.status || 'Pending',
        remarks: dto.remarks,
        createdAt: this.resolveCreatedAt(dto) ? new Date(this.resolveCreatedAt(dto) as string) : undefined,
      },
      include: { employee: { include: { store: true } } },
    });
  }

  findAll(filters?: { from?: string; to?: string; action?: string; status?: string; employeeId?: number; storeId?: number }) {
    const where: Prisma.FundsLogWhereInput = {};
    const from = this.normalizeDate(filters?.from);
    const to = this.normalizeDate(filters?.to);

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.storeId) {
      where.employee = {
        is: {
          storeId: filters.storeId,
        },
      };
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.fundsLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { store: true } } },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.fundsLog.findUnique({
      where: { id },
      include: { employee: { include: { store: true } } },
    });
    if (!record) throw new NotFoundException('Funds log not found');
    return record;
  }

  byEmployee(employeeId: number) {
    return this.prisma.fundsLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { store: true } } },
    });
  }

  async update(id: number, dto: UpdateFundsLogDto) {
    if (dto.status === 'Released') {
      const existing = await this.prisma.fundsLog.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!existing) {
        throw new NotFoundException('Funds log not found');
      }

      if (existing.status !== 'Released') {
        return this.release(id, dto);
      }
    }

    const employeeId = this.resolveEmployeeId(dto);
    return this.prisma.fundsLog.update({
      where: { id },
      data: {
        employeeId,
        atd: dto.atd,
        action: dto.action,
        type: dto.type,
        amount: dto.amount,
        encoder: dto.encoder,
        cashBy: this.resolveCashBy(dto),
        paymentMethod: this.resolvePaymentMethod(dto),
        status: dto.status,
        remarks: dto.remarks,
        createdAt: this.resolveCreatedAt(dto) ? new Date(this.resolveCreatedAt(dto) as string) : undefined,
      },
      include: { employee: { include: { store: true } } },
    });
  }

  async release(id: number, dto?: UpdateFundsLogDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.fundsLog.findUnique({
        where: { id },
        include: { employee: true },
      });

      if (!existing) {
        throw new NotFoundException('Funds log not found');
      }
      if (existing.status === 'Released') {
        throw new BadRequestException('Funds log is already released.');
      }

      const amount = dto?.amount !== undefined ? Number(dto.amount) : this.toNumber(existing.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Release amount must be greater than 0.');
      }

      const action = (dto?.action || existing.action || '').toUpperCase();
      if (action !== 'IN' && action !== 'OUT') {
        throw new BadRequestException('Action must be either IN or OUT.');
      }

      const currentFunds = this.toNumber(existing.employee.funds);
      if (action === 'OUT' && currentFunds < amount) {
        throw new BadRequestException('Insufficient employee funds.');
      }

      await tx.employee.update({
        where: { id: existing.employeeId },
        data: {
          funds:
            action === 'IN'
              ? { increment: amount }
              : { decrement: amount },
        },
      });

      return tx.fundsLog.update({
        where: { id },
        data: {
          employeeId: (dto ? this.resolveEmployeeId(dto) : undefined) ?? existing.employeeId,
          atd: dto?.atd ?? existing.atd,
          action,
          type: dto?.type ?? existing.type,
          amount,
          encoder: dto?.encoder ?? existing.encoder,
          cashBy: (dto ? this.resolveCashBy(dto) : undefined) ?? existing.cashBy,
          paymentMethod: (dto ? this.resolvePaymentMethod(dto) : undefined) ?? existing.paymentMethod,
          status: 'Released',
          remarks: dto?.remarks ?? existing.remarks,
          createdAt:
            dto && this.resolveCreatedAt(dto)
              ? new Date(this.resolveCreatedAt(dto) as string)
              : undefined,
        },
        include: { employee: { include: { store: true } } },
      });
    });
  }

  checkAtd(dto: CheckAtdDto) {
    return this.prisma.fundsLog.findMany({
      where: { atd: dto.atd },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  advancedSearch(dto: AdvancedSearchFundsDto) {
    const where: Prisma.FundsLogWhereInput = {};
    const from = this.normalizeDate(dto.dateFrom);
    const to = this.normalizeDate(dto.dateTo);
    const employeeIds = dto.employeeId?.length ? dto.employeeId : dto.employee_id;
    const storeIds = dto.storeId?.length ? dto.storeId : dto.store_id;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (employeeIds?.length) {
      where.employeeId = { in: employeeIds };
    }

    if (storeIds?.length) {
      where.employee = {
        is: {
          storeId: { in: storeIds },
        },
      };
    }

    if (dto.action) {
      where.action = dto.action;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    return this.prisma.fundsLog.findMany({
      where,
      include: { employee: { include: { store: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: number) {
    await this.prisma.fundsLog.delete({ where: { id } });
    return { success: true };
  }
}
