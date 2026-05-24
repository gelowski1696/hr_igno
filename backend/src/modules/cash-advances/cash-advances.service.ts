import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AdvancedSearchCashAdvanceDto } from './dto/advanced-search-cash-advance.dto';
import { CreateCashAdvanceDto } from './dto/create-cash-advance.dto';
import { CreateCashAdvancePaymentDto } from './dto/create-payment.dto';
import { UpdateCashAdvanceDto } from './dto/update-cash-advance.dto';

function money(value: number | string | Prisma.Decimal | { toString(): string } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function decimalString(value: number): string {
  return Math.max(0, Math.round(value * 100) / 100).toString();
}

@Injectable()
export class CashAdvancesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveEmployeeId(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.employeeId ?? dto.employee_id;
  }

  private resolveEmployeeCode(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.employeeCode ?? dto.employee_code;
  }

  private resolvePaymentMethod(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.paymentMethod ?? dto.payment_method;
  }

  private resolveDateIssued(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.dateIssued ?? dto.date_issued;
  }

  private resolveRepaymentDue(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.repaymentDue ?? dto.repayment_due;
  }

  private resolveInstallmentPlan(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    return dto.installmentPlan ?? dto.installment_plan;
  }

  private resolveTotalAmount(dto: CreateCashAdvanceDto | UpdateCashAdvanceDto) {
    const directTotal = dto.totalAmount ?? dto.totalamount;
    if (directTotal !== undefined && directTotal !== null) {
      return Number(directTotal);
    }
    const amount = Number(dto.amount ?? 0);
    const interests = Number(dto.interests ?? 0);
    return amount + (Number.isFinite(interests) && interests > 0 ? interests : 0);
  }

  private normalizeType(raw?: string) {
    const value = String(raw || '').trim();
    return value || 'Cash Advance';
  }

  private normalizeStatus(raw?: string): PaymentStatus | undefined {
    if (!raw) return undefined;
    const value = raw.trim().toUpperCase().replace(/\s+/g, '_');

    if (value === 'FOR_APPROVAL' || value === 'PENDING') {
      return PaymentStatus.PENDING;
    }
    if (value === 'UNPAID' || value === 'APPROVED') {
      return PaymentStatus.APPROVED;
    }
    if (value === 'PARTIAL') {
      return PaymentStatus.PARTIAL;
    }
    if (value === 'PAID') {
      return PaymentStatus.PAID;
    }
    if (value === 'CANCELLED') {
      return PaymentStatus.CANCELLED;
    }
    return undefined;
  }

  private normalizeDate(value?: string) {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeTypeFilter(raw?: string) {
    if (!raw) return [];
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildReferenceNumber(now = new Date(), sequence = 1) {
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const countPart = String(sequence).padStart(7, '0');
    return `${month}${day}${year}${countPart}`;
  }

  async create(dto: CreateCashAdvanceDto) {
    const employeeId = this.resolveEmployeeId(dto);
    if (!employeeId || !Number.isFinite(employeeId)) {
      throw new BadRequestException('employeeId is required.');
    }

    const type = this.normalizeType(dto.type);
    const status = this.normalizeStatus(dto.status) ?? PaymentStatus.PENDING;
    const totalAmount = this.resolveTotalAmount(dto);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException('totalAmount must be greater than zero.');
    }

    if (dto.atd) {
      const existingAtd = await this.prisma.cashAdvance.findFirst({
        where: { atd: dto.atd },
        select: { id: true },
      });
      if (existingAtd) {
        throw new BadRequestException('ATD already exists.');
      }
    }

    if (
      type === 'Cash Advance' &&
      (status === PaymentStatus.PENDING || status === PaymentStatus.APPROVED || status === PaymentStatus.PARTIAL)
    ) {
      const hasOpenCashAdvance = await this.prisma.cashAdvance.findFirst({
        where: {
          employeeId,
          type: 'Cash Advance',
          status: { in: [PaymentStatus.PENDING, PaymentStatus.APPROVED, PaymentStatus.PARTIAL] },
          balance: { gt: 0 },
        },
        select: { id: true },
      });
      if (hasOpenCashAdvance) {
        throw new BadRequestException(
          'Employee still has unpaid cash advances. Please settle them before creating a new one.',
        );
      }
    }

    const count = await this.prisma.cashAdvance.count();
    const generatedReference = this.buildReferenceNumber(new Date(), count + 1);

    return this.prisma.cashAdvance.create({
      data: {
        employeeId,
        employeeCode: this.resolveEmployeeCode(dto),
        referenceNumber: dto.referenceNumber || generatedReference,
        atd: dto.atd,
        amount: dto.amount,
        totalAmount,
        balance: totalAmount,
        interests: dto.interests ?? 0,
        reason: dto.reason,
        paymentMethod: this.resolvePaymentMethod(dto),
        encoder: dto.encoder,
        type,
        status,
        dateIssued: this.normalizeDate(this.resolveDateIssued(dto)),
        repaymentDue: this.normalizeDate(this.resolveRepaymentDue(dto)),
        installmentPlan: this.resolveInstallmentPlan(dto) ?? 1,
      },
      include: { employee: { include: { store: true } }, payments: true },
    });
  }

  findAll(filters?: { type?: string; status?: string; employeeId?: number; from?: string; to?: string }) {
    const where: Prisma.CashAdvanceWhereInput = {};
    const types = this.normalizeTypeFilter(filters?.type);
    const from = this.normalizeDate(filters?.from);
    const to = this.normalizeDate(filters?.to);

    if (types.length === 1) {
      where.type = types[0];
    } else if (types.length > 1) {
      where.type = { in: types };
    }

    const normalizedStatus = this.normalizeStatus(filters?.status);
    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (from || to) {
      where.dateIssued = {};
      if (from) where.dateIssued.gte = from;
      if (to) where.dateIssued.lte = to;
    }

    return this.prisma.cashAdvance.findMany({
      where,
      orderBy: { dateIssued: 'desc' },
      include: { employee: { include: { store: true } }, payments: true },
    });
  }

  byEmployee(employeeId: number, type?: string) {
    const types = this.normalizeTypeFilter(type);
    const where: Prisma.CashAdvanceWhereInput = { employeeId };
    if (types.length === 1) {
      where.type = types[0];
    } else if (types.length > 1) {
      where.type = { in: types };
    }

    return this.prisma.cashAdvance.findMany({
      where,
      orderBy: { dateIssued: 'desc' },
      include: { employee: { include: { store: true } }, payments: true },
    });
  }

  unpaidByEmployee(employeeId: number, type?: string) {
    const defaultType = this.normalizeTypeFilter(type);
    const types = defaultType.length ? defaultType : ['Cash Advance'];

    return this.prisma.cashAdvance.findMany({
      where: {
        employeeId,
        type: types.length === 1 ? types[0] : { in: types },
        status: { in: [PaymentStatus.APPROVED, PaymentStatus.PARTIAL] },
        balance: { gt: 0 },
      },
      orderBy: { dateIssued: 'desc' },
      include: { employee: { include: { store: true } }, payments: true },
    });
  }

  checkAtd(atd: string) {
    return this.prisma.cashAdvance.findMany({
      where: { atd },
      include: { employee: { include: { store: true } }, payments: true },
      orderBy: { dateIssued: 'desc' },
    });
  }

  advancedSearch(dto: AdvancedSearchCashAdvanceDto) {
    const where: Prisma.CashAdvanceWhereInput = {};

    const from = this.normalizeDate(dto.dateFrom);
    const to = this.normalizeDate(dto.dateTo);
    if (from || to) {
      where.dateIssued = {};
      if (from) where.dateIssued.gte = from;
      if (to) where.dateIssued.lte = to;
    }

    const employeeIds = dto.employeeId?.length ? dto.employeeId : dto.employee_id;
    if (employeeIds?.length) {
      where.employeeId = { in: employeeIds };
    }

    const status = this.normalizeStatus(dto.status);
    if (status) {
      where.status = status;
    }

    const paymentMethod = dto.paymentMethod ?? dto.payment_method;
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (dto.atd) {
      where.atd = dto.atd;
    }

    const types = Array.isArray(dto.type) ? dto.type : dto.type ? [dto.type] : [];
    if (types.length) {
      where.type = { in: types.filter(Boolean) };
    }

    const storeIds = dto.storeId?.length ? dto.storeId : dto.store_id;
    const groupIds = dto.groupId?.length ? dto.groupId : dto.group_id;

    if (storeIds?.length || groupIds?.length) {
      where.employee = {
        is: {
          ...(storeIds?.length ? { storeId: { in: storeIds } } : {}),
          ...(groupIds?.length
            ? {
                groups: {
                  some: {
                    groupId: { in: groupIds },
                  },
                },
              }
            : {}),
        },
      };
    }

    return this.prisma.cashAdvance.findMany({
      where,
      include: {
        payments: true,
        employee: {
          include: {
            store: true,
            groups: true,
          },
        },
      },
      orderBy: { dateIssued: 'desc' },
    });
  }

  async findOne(id: number) {
    const cashAdvance = await this.prisma.cashAdvance.findUnique({
      where: { id },
      include: { employee: { include: { store: true } }, payments: true },
    });
    if (!cashAdvance) throw new NotFoundException('Cash advance not found');
    return cashAdvance;
  }

  async update(id: number, dto: UpdateCashAdvanceDto) {
    const current = await this.prisma.cashAdvance.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        amount: true,
        interests: true,
        totalAmount: true,
        totalPaid: true,
        status: true,
        type: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Cash advance not found');
    }

    const employeeId = this.resolveEmployeeId(dto) ?? current.employeeId;
    const amount = dto.amount ?? money(current.amount);
    const interests = dto.interests ?? money(current.interests);
    const totalAmount =
      dto.totalAmount ?? dto.totalamount ?? amount + (Number.isFinite(interests) && interests > 0 ? interests : 0);
    const totalPaid = money(current.totalPaid);
    const balance = Math.max(totalAmount - totalPaid, 0);
    const requestedStatus = this.normalizeStatus(dto.status);
    const nextStatus =
      balance <= 0
        ? PaymentStatus.PAID
        : requestedStatus ??
          (totalPaid > 0
            ? PaymentStatus.PARTIAL
            : current.status === PaymentStatus.APPROVED
              ? PaymentStatus.APPROVED
              : current.status === PaymentStatus.CANCELLED
                ? PaymentStatus.CANCELLED
                : PaymentStatus.PENDING);

    if (dto.atd) {
      const existingAtd = await this.prisma.cashAdvance.findFirst({
        where: {
          atd: dto.atd,
          id: { not: id },
        },
        select: { id: true },
      });
      if (existingAtd) {
        throw new BadRequestException('ATD already exists.');
      }
    }

    return this.prisma.cashAdvance.update({
      where: { id },
      data: {
        employeeId,
        employeeCode: this.resolveEmployeeCode(dto),
        referenceNumber: dto.referenceNumber,
        atd: dto.atd,
        amount,
        interests,
        totalAmount,
        balance,
        reason: dto.reason,
        paymentMethod: this.resolvePaymentMethod(dto),
        encoder: dto.encoder,
        type: dto.type ?? current.type,
        status: nextStatus,
        dateIssued: this.normalizeDate(this.resolveDateIssued(dto)),
        repaymentDue: this.normalizeDate(this.resolveRepaymentDue(dto)),
        installmentPlan: this.resolveInstallmentPlan(dto),
      },
      include: { employee: { include: { store: true } }, payments: true },
    });
  }

  async remove(id: number) {
    await this.prisma.cashAdvance.delete({ where: { id } });
    return { success: true };
  }

  private async resolvePaymentRecorderMap(paymentIds: number[]) {
    const recorderMap = new Map<string, string>();
    if (!paymentIds.length) {
      return recorderMap;
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'cash_advance_payment',
        entityId: { in: paymentIds.map((id) => String(id)) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            username: true,
          },
        },
      },
    });

    for (const log of logs) {
      const entityId = log.entityId || '';
      if (!entityId || recorderMap.has(entityId)) continue;
      const metadataBy = extractMetadataBy(log.metadata);
      const actorName = log.actor?.username || metadataBy;
      if (actorName) {
        recorderMap.set(entityId, actorName);
      }
    }

    return recorderMap;
  }

  async addPayment(id: number, dto: CreateCashAdvancePaymentDto, user?: CurrentUserPayload) {
    if (dto.amountPaid <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const cashAdvance = await tx.cashAdvance.findUnique({ where: { id } });
      if (!cashAdvance) throw new NotFoundException('Cash advance not found');
      if (cashAdvance.status === PaymentStatus.PENDING) {
        throw new BadRequestException('This record is still pending approval. Approve it before recording payment.');
      }
      if (cashAdvance.status === PaymentStatus.CANCELLED) {
        throw new BadRequestException('Cancelled records cannot receive payments.');
      }

      const balance = money(cashAdvance.balance);
      if (dto.amountPaid > balance) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextBalance = balance - dto.amountPaid;
      const nextTotalPaid = money(cashAdvance.totalPaid) + dto.amountPaid;
      const status = nextBalance === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

      const payment = await tx.cashAdvancePayment.create({
        data: {
          cashAdvanceId: id,
          amountPaid: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          type: dto.type,
          status: PaymentStatus.PAID,
        },
      });
      if (user?.id) {
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CASH_ADVANCE_PAYMENT_CREATED',
            entityType: 'cash_advance_payment',
            entityId: String(payment.id),
            metadata: {
              cashAdvanceId: id,
              amountPaid: dto.amountPaid,
              paymentMethod: dto.paymentMethod || null,
              type: dto.type || null,
              by: user.username,
            },
          },
        });
      }

      const updated = await tx.cashAdvance.update({
        where: { id },
        data: {
          totalPaid: decimalString(nextTotalPaid),
          balance: decimalString(nextBalance),
          status,
        },
      });

      return {
        payment: {
          ...payment,
          recordedBy: user?.username ?? null,
        },
        cashAdvance: updated,
      };
    });
  }

  async approve(id: number, user?: CurrentUserPayload) {
    return this.prisma.$transaction(async (tx) => {
      const cashAdvance = await tx.cashAdvance.findUnique({
        where: { id },
        include: { employee: { include: { store: true } }, payments: true },
      });
      if (!cashAdvance) {
        throw new NotFoundException('Cash advance not found');
      }
      if (cashAdvance.status === PaymentStatus.CANCELLED) {
        throw new BadRequestException('Cancelled records cannot be approved.');
      }
      if (cashAdvance.status === PaymentStatus.APPROVED || cashAdvance.status === PaymentStatus.PARTIAL || cashAdvance.status === PaymentStatus.PAID) {
        return cashAdvance;
      }

      const nextStatus = money(cashAdvance.balance) <= 0 ? PaymentStatus.PAID : PaymentStatus.APPROVED;
      const updated = await tx.cashAdvance.update({
        where: { id },
        data: { status: nextStatus },
        include: { employee: { include: { store: true } }, payments: true },
      });

      if (user?.id) {
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CASH_ADVANCE_APPROVED',
            entityType: 'cash_advance',
            entityId: String(id),
            metadata: {
              status: nextStatus,
              by: user.username,
            },
          },
        });
      }

      return updated;
    });
  }

  async paymentHistory(filters?: { type?: string; status?: string; employeeId?: number; from?: string; to?: string }) {
    const where: Prisma.CashAdvancePaymentWhereInput = {};
    const types = this.normalizeTypeFilter(filters?.type);
    const from = this.normalizeDate(filters?.from);
    const to = this.normalizeDate(filters?.to);

    const normalizedStatus = this.normalizeStatus(filters?.status);
    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (from || to) {
      where.paymentDate = {};
      if (from) where.paymentDate.gte = from;
      if (to) where.paymentDate.lte = to;
    }

    const cashAdvanceWhere: Prisma.CashAdvanceWhereInput = {};
    if (types.length === 1) {
      cashAdvanceWhere.type = types[0];
    } else if (types.length > 1) {
      cashAdvanceWhere.type = { in: types };
    }
    if (filters?.employeeId) {
      cashAdvanceWhere.employeeId = filters.employeeId;
    }
    if (Object.keys(cashAdvanceWhere).length > 0) {
      where.cashAdvance = { is: cashAdvanceWhere };
    }

    const payments = await this.prisma.cashAdvancePayment.findMany({
      where,
      include: {
        cashAdvance: {
          include: {
            employee: {
              include: { store: true },
            },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const recordedByMap = await this.resolvePaymentRecorderMap(payments.map((payment) => payment.id));

    return payments.map((payment) => ({
      id: payment.id,
      cashAdvanceId: payment.cashAdvanceId,
      atd: payment.cashAdvance?.atd ?? null,
      referenceNumber: payment.cashAdvance?.referenceNumber ?? null,
      dateIssued: payment.cashAdvance?.dateIssued ?? null,
      type: payment.cashAdvance?.type ?? payment.type ?? null,
      employee: payment.cashAdvance?.employee ?? null,
      amountPaid: money(payment.amountPaid),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod ?? payment.cashAdvance?.paymentMethod ?? null,
      status: payment.status,
      createdAt: payment.createdAt,
      recordedBy: recordedByMap.get(String(payment.id)) || null,
    }));
  }

  async payments(id: number) {
    const payments = await this.prisma.cashAdvancePayment.findMany({
      where: { cashAdvanceId: id },
      orderBy: { paymentDate: 'desc' },
    });

    if (!payments.length) {
      return payments;
    }
    const recordedByMap = await this.resolvePaymentRecorderMap(payments.map((payment) => payment.id));

    return payments.map((payment) => ({
      ...payment,
      recordedBy: recordedByMap.get(String(payment.id)) || null,
    }));
  }
}

function extractMetadataBy(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const by = (metadata as Record<string, unknown>).by;
  return typeof by === 'string' && by.trim() ? by : null;
}
