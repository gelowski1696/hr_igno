import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GEO_LOCATION_USAGE_EXCEEDED_MESSAGE, RemoteClockService } from './remote-clock.service';

describe('RemoteClockService', () => {
  const fixedNow = new Date('2026-05-08T04:00:00.000Z');
  const originalLocationIqApiKey = process.env.LOCATIONIQ_API_KEY;

  afterEach(() => {
    if (originalLocationIqApiKey === undefined) {
      delete process.env.LOCATIONIQ_API_KEY;
    } else {
      process.env.LOCATIONIQ_API_KEY = originalLocationIqApiKey;
    }
    jest.restoreAllMocks();
  });

  function makeService(overrides: Record<string, unknown> = {}, options: { stubLocationLabel?: boolean } = {}) {
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
    if (options.stubLocationLabel !== false) {
      (service as any).resolveLocationLabel = jest.fn(async () => 'Makati City, Metro Manila');
    }

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

  it('creates a clock-in record with Manila day duplicate protection and uploaded image path', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue(null);

    await service.clockIn({
      employeeId: 7,
      location: '14.5547,121.0244',
      imagePath: '/uploads/employee-time-record/7.png',
    });

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
    expect(prisma.timeRecord.create).toHaveBeenCalledWith({
      data: {
        employeeId: 7,
        timeIn: fixedNow,
        locationIn: 'Makati City, Metro Manila',
        timeInImage: '/uploads/employee-time-record/7.png',
        source: 'REMOTE_CLOCK',
      },
    });
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

  it('updates the latest open record when clocking out within 24 hours', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findUnique.mockResolvedValue({ id: 7, status: 'ACTIVE' });
    prisma.timeRecord.findFirst.mockResolvedValue({ id: 10, timeOut: null });

    await service.clockOut({
      employeeId: 7,
      location: '14.5547,121.0244',
      imagePath: '/uploads/employee-time-record/7-out.png',
    });

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
    expect(prisma.timeRecord.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        timeOut: fixedNow,
        locationOut: 'Makati City, Metro Manila',
        timeOutImage: '/uploads/employee-time-record/7-out.png',
      },
    });
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

  it('reports GEO Location usage exhaustion from LocationIQ', async () => {
    process.env.LOCATIONIQ_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Daily usage exceeded' })),
    } as unknown as Response);
    const { service } = makeService({}, { stubLocationLabel: false });

    await expect(service.resolveLocation('14.5547,121.0244')).rejects.toThrow(
      GEO_LOCATION_USAGE_EXCEEDED_MESSAGE,
    );
  });

  it('falls back to Nominatim when LocationIQ fails for a non-quota reason', async () => {
    process.env.LOCATIONIQ_API_KEY = 'test-key';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Temporary geocoder error' })),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ display_name: 'Makati City, Metro Manila' }),
      } as unknown as Response);
    const { service } = makeService({}, { stubLocationLabel: false });

    await expect(service.resolveLocation('14.5547,121.0244')).resolves.toEqual({
      location: '14.5547,121.0244',
      address: 'Makati City, Metro Manila',
    });
  });
});
