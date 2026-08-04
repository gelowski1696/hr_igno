import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GEO_LOCATION_USAGE_EXCEEDED_MESSAGE, RemoteClockService } from './remote-clock.service';

describe('RemoteClockService', () => {
  const fixedNow = new Date('2026-05-08T04:00:00.000Z');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma: any = {
      employee: {
        findUnique: jest.fn(),
      },
      timeRecord: {
        findFirst: jest.fn(),
        create: jest.fn((args) => Promise.resolve({ id: 10, ...args.data })),
        update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      ...overrides,
    };
    const service = new RemoteClockService(prisma);
    (service as any).now = jest.fn(() => fixedNow);

    return { service, prisma };
  }

  it('finds an active employee by employee code with store details', async () => {
    const employee = {
      id: 7,
      employeeCode: 'EMP-001',
      firstName: 'Ana',
      lastName: 'Reyes',
      position: 'Cashier',
      status: 'ACTIVE',
      store: { id: 3, name: 'Main Branch' },
    };
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue(employee);

    const result = await service.findEmployeeByCode(' emp-001 ');

    expect(prisma.employee.findUnique).toHaveBeenCalledWith({
      where: { employeeCode: 'emp-001' },
      include: { store: true },
    });
    expect(result).toEqual(employee);
  });

  it('rejects unknown employee codes', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(service.findEmployeeByCode('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects clock-in with GEO Location usage exceeded before creating a record', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.clockIn({
        employeeId: 7,
        location: '14.5547,121.0244',
        imagePath: '/uploads/employee-time-record/7.png',
      }),
    ).rejects.toThrow(GEO_LOCATION_USAGE_EXCEEDED_MESSAGE);

    expect(prisma.timeRecord.findFirst).toHaveBeenCalledWith({
      where: {
        employeeId: 7,
        timeIn: {
          gte: new Date('2026-05-07T16:00:00.000Z'),
          lt: new Date('2026-05-08T16:00:00.000Z'),
        },
      },
      orderBy: { timeIn: 'desc' },
    });
    expect(prisma.timeRecord.create).not.toHaveBeenCalled();
  });

  it('rejects clock-in when an open record already exists today', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue({ id: 10, timeOut: null });

    await expect(
      service.clockIn({
        employeeId: 7,
        location: '14.5547,121.0244',
        imagePath: '/uploads/employee-time-record/7.png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects clock-out with GEO Location usage exceeded before updating the open record', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue({ id: 10, timeOut: null });

    await expect(
      service.clockOut({
        employeeId: 7,
        location: '14.5547,121.0244',
        imagePath: '/uploads/employee-time-record/7-out.png',
      }),
    ).rejects.toThrow(GEO_LOCATION_USAGE_EXCEEDED_MESSAGE);

    expect(prisma.timeRecord.findFirst).toHaveBeenCalledWith({
      where: {
        employeeId: 7,
        timeOut: null,
        timeIn: {
          gte: new Date('2026-05-07T04:00:00.000Z'),
          lte: fixedNow,
        },
      },
      orderBy: { timeIn: 'desc' },
    });
    expect(prisma.timeRecord.update).not.toHaveBeenCalled();
  });

  it('rejects clock-out without an active clock-in', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue(null);

    await expect(
      service.clockOut({
        employeeId: 7,
        location: '14.5547,121.0244',
        imagePath: '/uploads/employee-time-record/7-out.png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('always rejects location resolution with GEO Location usage exceeded', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const { service } = makeService();

    await expect(service.resolveLocation('14.5547,121.0244')).rejects.toThrow(
      GEO_LOCATION_USAGE_EXCEEDED_MESSAGE,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
