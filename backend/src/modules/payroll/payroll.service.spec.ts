import { BadRequestException } from '@nestjs/common';
import { PayrollService } from './payroll.service';

describe('PayrollService release', () => {
  it('releases draft payroll exactly once', async () => {
    const payroll = { id: 9, status: 'DRAFT' };
    const prisma = {
      payroll: {
        findUnique: jest.fn().mockResolvedValue(payroll),
        update: jest.fn().mockResolvedValue({ ...payroll, status: 'RELEASED' }),
      },
    };
    const service = new PayrollService(prisma as any);

    const result = await service.release(9, 'admin');

    expect(prisma.payroll.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: 'RELEASED', createdBy: 'admin' },
    });
    expect(result.status).toBe('RELEASED');
  });

  it('rejects already released payroll', async () => {
    const prisma = {
      payroll: {
        findUnique: jest.fn().mockResolvedValue({ id: 9, status: 'RELEASED' }),
      },
    };
    const service = new PayrollService(prisma as any);

    await expect(service.release(9, 'admin')).rejects.toBeInstanceOf(BadRequestException);
  });
});

