import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceSource, EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type RemoteClockInput = {
  employeeId: number;
  location: string;
  imagePath?: string;
};

type Coordinates = {
  lat: number;
  lon: number;
};

@Injectable()
export class RemoteClockService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findEmployeeByCode(employeeCode: string) {
    const normalizedCode = employeeCode.trim();
    if (!normalizedCode) {
      throw new BadRequestException('Employee code is required');
    }

    const employee = await this.prisma.employee.findUnique({
      where: { employeeCode: normalizedCode },
      include: { store: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async clockIn(input: RemoteClockInput) {
    await this.validateEmployee(input.employeeId);
    this.requireImage(input.imagePath);

    const now = this.now();
    const { start, end } = getManilaDayRange(now);
    const existingRecord = await this.prisma.timeRecord.findFirst({
      where: {
        employeeId: input.employeeId,
        timeIn: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { timeIn: 'desc' },
    });

    if (existingRecord?.timeOut === null) {
      throw new BadRequestException('You must clock out before clocking in again');
    }

    const locationIn = await this.resolveLocationLabel(input.location);

    return this.prisma.timeRecord.create({
      data: {
        employeeId: input.employeeId,
        timeIn: now,
        locationIn,
        timeInImage: input.imagePath,
        source: AttendanceSource.REMOTE_CLOCK,
      },
    });
  }

  async clockOut(input: RemoteClockInput) {
    await this.validateEmployee(input.employeeId);
    this.requireImage(input.imagePath);

    const now = this.now();
    const activeRecord = await this.prisma.timeRecord.findFirst({
      where: {
        employeeId: input.employeeId,
        timeOut: null,
        timeIn: {
          gte: new Date(now.getTime() - DAY_MS),
          lte: now,
        },
      },
      orderBy: { timeIn: 'desc' },
    });

    if (!activeRecord) {
      throw new BadRequestException('No valid active clock-in found within the last 24 hours');
    }

    const locationOut = await this.resolveLocationLabel(input.location);

    return this.prisma.timeRecord.update({
      where: { id: activeRecord.id },
      data: {
        timeOut: now,
        locationOut,
        timeOutImage: input.imagePath,
      },
    });
  }

  async resolveLocation(location: string) {
    const normalized = location.trim();
    if (!normalized) {
      throw new BadRequestException('Location is required');
    }

    const address = await this.resolveLocationLabel(normalized);
    return {
      location: normalized,
      address,
    };
  }

  private async validateEmployee(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { store: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Only active employees can use remote clock');
    }

    return employee;
  }

  private requireImage(imagePath?: string) {
    if (!imagePath) {
      throw new BadRequestException('Photo is required before clocking');
    }
  }

  private now() {
    return new Date();
  }

  private async resolveLocationLabel(location: string) {
    const coordinates = parseCoordinates(location);
    const fallbackLabel = location.trim();

    const locationIqAddress = await this.reverseWithLocationIq(coordinates);
    if (locationIqAddress) {
      return locationIqAddress;
    }

    const nominatimAddress = await this.reverseWithNominatim(coordinates);
    if (nominatimAddress) {
      return nominatimAddress;
    }

    return fallbackLabel;
  }

  private async reverseWithLocationIq(coordinates: Coordinates) {
    const apiKey = process.env.LOCATIONIQ_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        key: apiKey,
        lat: String(coordinates.lat),
        lon: String(coordinates.lon),
        format: 'json',
      });
      const response = await fetch(`https://us1.locationiq.com/v1/reverse?${params.toString()}`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { display_name?: string };
      const address = payload.display_name?.trim();
      return address || null;
    } catch {
      return null;
    }
  }

  private async reverseWithNominatim(coordinates: Coordinates) {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(coordinates.lat),
        lon: String(coordinates.lon),
        addressdetails: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'VMJAMTECH-HR/1.0 (remote-clock)',
        },
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as { display_name?: string };
      const address = payload.display_name?.trim();
      return address || null;
    } catch {
      return null;
    }
  }
}

export function getManilaDayRange(now: Date) {
  const manilaDate = new Date(now.getTime() + MANILA_OFFSET_MS);
  const startUtc = Date.UTC(
    manilaDate.getUTCFullYear(),
    manilaDate.getUTCMonth(),
    manilaDate.getUTCDate(),
  );
  const start = new Date(startUtc - MANILA_OFFSET_MS);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

export function parseCoordinates(location: string): Coordinates {
  const [latValue, lonValue] = location.split(',').map((value) => Number(value.trim()));
  if (!Number.isFinite(latValue) || !Number.isFinite(lonValue)) {
    throw new BadRequestException('Invalid location format');
  }
  return { lat: latValue, lon: lonValue };
}
