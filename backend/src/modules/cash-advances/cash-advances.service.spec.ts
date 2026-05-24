import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CashAdvancesService } from './cash-advances.service';

describe('CashAdvancesService balance calculation', () => {
  function serviceWithCashAdvance(cashAdvance: any) {
    const prisma: any = {
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
      cashAdvance: {
        findUnique: jest.fn().mockResolvedValue(cashAdvance),
        update: jest.fn((args) => Promise.resolve({ ...cashAdvance, ...args.data })),
      },
      cashAdvancePayment: {
        create: jest.fn((args) => Promise.resolve(args.data)),
      },
    };
    return { service: new CashAdvancesService(prisma as any), prisma };
  }

  it('records a payment and reduces the remaining balance', async () => {
    const { service, prisma } = serviceWithCashAdvance({
      id: 1,
      totalPaid: { toString: () => '20' },
      balance: { toString: () => '80' },
    });

    const result = await service.addPayment(1, {
      amountPaid: 30,
      paymentMethod: 'cash',
    });

    expect(prisma.cashAdvance.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        totalPaid: '50',
        balance: '50',
        status: 'PARTIAL',
      },
    });
    expect(result.cashAdvance.balance).toBe('50');
  });

  it('marks an advance paid when payment clears the balance', async () => {
    const { service, prisma } = serviceWithCashAdvance({
      id: 1,
      totalPaid: { toString: () => '80' },
      balance: { toString: () => '20' },
    });

    await service.addPayment(1, { amountPaid: 20 });

    expect(prisma.cashAdvance.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        totalPaid: '100',
        balance: '0',
        status: 'PAID',
      },
    });
  });

  it('rejects payments greater than current balance', async () => {
    const { service } = serviceWithCashAdvance({
      id: 1,
      totalPaid: { toString: () => '0' },
      balance: { toString: () => '10' },
    });

    await expect(service.addPayment(1, { amountPaid: 11 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects payments while record is pending approval', async () => {
    const { service } = serviceWithCashAdvance({
      id: 1,
      status: 'PENDING',
      totalPaid: { toString: () => '0' },
      balance: { toString: () => '10' },
    });

    await expect(service.addPayment(1, { amountPaid: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects payments for missing cash advances', async () => {
    const { service } = serviceWithCashAdvance(null);

    await expect(service.addPayment(1, { amountPaid: 10 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
