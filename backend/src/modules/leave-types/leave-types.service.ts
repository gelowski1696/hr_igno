import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { getUploadsRoot } from '../../common/uploads-root';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

type LeaveTypeRecord = {
  id: number;
  leaveName: string;
  type: string;
  leaveUnit: string;
  status: string;
  note: string;
  duration: number;
  createdBy: string;
  carryOver: string;
  notificationPeriod: string;
  maxLeaves: number;
  annualLimit: number;
};

const defaultLeaveTypes: LeaveTypeRecord[] = [
  {
    id: 1,
    leaveName: 'Vacation Leave',
    type: 'Paid',
    leaveUnit: 'Day',
    status: 'Active',
    note: '',
    duration: 1,
    createdBy: 'HR Department',
    carryOver: 'Allowed',
    notificationPeriod: '24 hours prior',
    maxLeaves: 30,
    annualLimit: 15,
  },
  {
    id: 2,
    leaveName: 'Sick Leave',
    type: 'Paid',
    leaveUnit: 'Day',
    status: 'Active',
    note: '',
    duration: 1,
    createdBy: 'HR Department',
    carryOver: 'Not allowed',
    notificationPeriod: 'On filing',
    maxLeaves: 30,
    annualLimit: 15,
  },
  {
    id: 3,
    leaveName: 'Leave Without Pay',
    type: 'Unpaid',
    leaveUnit: 'Day',
    status: 'Active',
    note: 'No balance deduction.',
    duration: 1,
    createdBy: 'HR Department',
    carryOver: 'Not allowed',
    notificationPeriod: '24 hours prior',
    maxLeaves: 365,
    annualLimit: 365,
  },
  {
    id: 4,
    leaveName: 'Half Day AM',
    type: 'Unpaid',
    leaveUnit: 'Half Day',
    status: 'Active',
    note: '',
    duration: 1,
    createdBy: 'HR Department',
    carryOver: 'Not allowed',
    notificationPeriod: 'Same day',
    maxLeaves: 365,
    annualLimit: 365,
  },
  {
    id: 5,
    leaveName: 'Half Day PM',
    type: 'Unpaid',
    leaveUnit: 'Half Day',
    status: 'Active',
    note: '',
    duration: 1,
    createdBy: 'HR Department',
    carryOver: 'Not allowed',
    notificationPeriod: 'Same day',
    maxLeaves: 365,
    annualLimit: 365,
  },
];

@Injectable()
export class LeaveTypesService {
  private readonly dataPath = this.resolveDataPath();

  private resolveDataPath() {
    const configured = process.env.LEAVE_TYPES_DATA_PATH?.trim();
    if (configured) {
      return resolve(configured);
    }

    const uploadsPath = join(getUploadsRoot(), 'leave-types.json');
    if (process.env.NODE_ENV === 'production') {
      return uploadsPath;
    }

    const legacyPath = join(process.cwd(), 'data', 'leave-types.json');
    if (existsSync(legacyPath)) {
      return legacyPath;
    }

    return uploadsPath;
  }

  private async ensureDataFile() {
    try {
      await mkdir(dirname(this.dataPath), { recursive: true });
    } catch (error) {
      throw new InternalServerErrorException(
        `Leave types storage path is not writable (${this.dataPath}). ` +
          'Configure LEAVE_TYPES_DATA_PATH or UPLOAD_ROOT to a writable directory.',
      );
    }

    try {
      await readFile(this.dataPath, 'utf8');
    } catch {
      await writeFile(this.dataPath, JSON.stringify(defaultLeaveTypes, null, 2), 'utf8');
    }
  }

  private async readAll(): Promise<LeaveTypeRecord[]> {
    await this.ensureDataFile();
    const raw = await readFile(this.dataPath, 'utf8');
    const parsed = JSON.parse(raw) as LeaveTypeRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.sort((a, b) => String(a.leaveName || '').localeCompare(String(b.leaveName || '')));
  }

  private async writeAll(records: LeaveTypeRecord[]) {
    await writeFile(this.dataPath, JSON.stringify(records, null, 2), 'utf8');
  }

  async create(dto: CreateLeaveTypeDto) {
    const rows = await this.readAll();
    const id = rows.length ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
    const record: LeaveTypeRecord = {
      id,
      leaveName: dto.leaveName,
      type: dto.type || 'Paid',
      leaveUnit: dto.leaveUnit || 'Day',
      status: dto.status || 'Active',
      note: dto.note || '',
      duration: dto.duration ?? 1,
      createdBy: dto.createdBy || 'HR Department',
      carryOver: dto.carryOver || 'Not allowed',
      notificationPeriod: dto.notificationPeriod || '24 hours prior',
      maxLeaves: dto.maxLeaves ?? 0,
      annualLimit: dto.annualLimit ?? 0,
    };
    rows.push(record);
    await this.writeAll(rows);
    return record;
  }

  findAll() {
    return this.readAll();
  }

  async findOne(id: number) {
    const rows = await this.readAll();
    const record = rows.find((row) => row.id === id);
    if (!record) throw new NotFoundException('Leave type not found');
    return record;
  }

  async update(id: number, dto: UpdateLeaveTypeDto) {
    const rows = await this.readAll();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new NotFoundException('Leave type not found');

    const existing = rows[index];
    const updated: LeaveTypeRecord = {
      ...existing,
      leaveName: dto.leaveName ?? existing.leaveName,
      type: dto.type ?? existing.type,
      leaveUnit: dto.leaveUnit ?? existing.leaveUnit,
      status: dto.status ?? existing.status,
      note: dto.note ?? existing.note,
      duration: dto.duration ?? existing.duration,
      createdBy: dto.createdBy ?? existing.createdBy,
      carryOver: dto.carryOver ?? existing.carryOver,
      notificationPeriod: dto.notificationPeriod ?? existing.notificationPeriod,
      maxLeaves: dto.maxLeaves ?? existing.maxLeaves,
      annualLimit: dto.annualLimit ?? existing.annualLimit,
    };

    rows[index] = updated;
    await this.writeAll(rows);
    return updated;
  }

  async remove(id: number) {
    const rows = await this.readAll();
    const next = rows.filter((row) => row.id !== id);
    if (next.length === rows.length) throw new NotFoundException('Leave type not found');
    await this.writeAll(next);
    return { success: true };
  }
}
