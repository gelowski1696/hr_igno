import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  findForLogin(username: string) {
    return this.prisma.userAccount.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        status: true,
        employeeId: true,
        storeId: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const created = await this.prisma.userAccount.create({
      data: {
        username: dto.username,
        passwordHash: await this.passwords.hash(dto.password),
        role: dto.role,
        status: dto.status,
        employeeId: dto.employeeId,
        employeeCode: dto.employeeCode,
        storeId: dto.storeId,
        storeCode: dto.storeCode,
      },
      select: this.safeSelect(),
    });
    return this.decorateUser(created);
  }

  async findAll() {
    const users = await this.prisma.userAccount.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.safeSelect(),
    });
    return users.map((user) => this.decorateUser(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.userAccount.findUnique({
      where: { id },
      select: this.safeSelect(),
    });
    if (!user) throw new NotFoundException('User account not found');
    return this.decorateUser(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const data: Prisma.UserAccountUpdateInput = {
      username: dto.username,
      role: dto.role,
      status: dto.status,
      employeeCode: dto.employeeCode,
      storeCode: dto.storeCode,
    };
    if (dto.password) {
      data.passwordHash = await this.passwords.hash(dto.password);
      data.mustChangePassword = false;
    }
    if (typeof dto.employeeId === 'number') {
      data.employee = { connect: { id: dto.employeeId } };
    }
    if (typeof dto.storeId === 'number') {
      data.store = { connect: { id: dto.storeId } };
    }

    const updated = await this.prisma.userAccount.update({
      where: { id },
      data,
      select: this.safeSelect(),
    });
    return this.decorateUser(updated);
  }

  async remove(id: number) {
    await this.prisma.userAccount.delete({ where: { id } });
    return { success: true };
  }

  private safeSelect() {
    return {
      id: true,
      username: true,
      role: true,
      menuRole: true,
      status: true,
      employeeId: true,
      employeeCode: true,
      storeId: true,
      storeCode: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
      employee: {
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          storeId: true,
          store: {
            select: {
              id: true,
              code: true,
              name: true,
              area: true,
            },
          },
        },
      },
      store: {
        select: {
          id: true,
          code: true,
          name: true,
          area: true,
        },
      },
    } satisfies Prisma.UserAccountSelect;
  }

  private decorateUser(
    user: {
      id: number;
      username: string;
      role: string;
      menuRole: string | null;
      status: string;
      employeeId: number | null;
      employeeCode: string | null;
      storeId: number | null;
      storeCode: string | null;
      mustChangePassword: boolean;
      createdAt: Date;
      updatedAt: Date;
      employee?: {
        id: number;
        employeeCode: string;
        firstName: string;
        lastName: string;
        storeId: number | null;
        store: { id: number; code: string; name: string; area: string | null } | null;
      } | null;
      store?: { id: number; code: string; name: string; area: string | null } | null;
    },
  ) {
    const employeeName = user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`.trim()
      : '';
    const employeeLabel = user.employee
      ? `${user.employee.employeeCode}${employeeName ? ` - ${employeeName}` : ''}`
      : user.employeeCode || '-';
    const storeLabel = user.store
      ? `${user.store.code}${user.store.name ? ` - ${user.store.name}` : ''}`
      : user.storeCode || '-';

    return {
      ...user,
      employeeLabel,
      storeLabel,
    };
  }
}
