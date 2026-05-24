import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';

@Injectable()
export class AllowancesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAllowanceDto) {
    return this.prisma.allowance.create({
      data: {
        employeeId: dto.employeeId,
        atd: dto.atd,
        type: dto.type,
        amount: dto.amount,
        encoder: dto.encoder || 'system',
        status: dto.status || 'Pending',
        remarks: dto.remarks,
      },
    });
  }

  findAll() {
    return this.prisma.allowance.findMany({
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { store: true } } },
    });
  }

  byEmployee(employeeId: number) {
    return this.prisma.allowance.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: { employee: { include: { store: true } } },
    });
  }

  update(id: number, dto: UpdateAllowanceDto) {
    return this.prisma.allowance.update({
      where: { id },
      data: {
        employeeId: dto.employeeId,
        atd: dto.atd,
        type: dto.type,
        amount: dto.amount,
        encoder: dto.encoder,
        status: dto.status,
        remarks: dto.remarks,
      },
      include: { employee: { include: { store: true } } },
    });
  }

  async remove(id: number) {
    await this.prisma.allowance.delete({ where: { id } });
    return { success: true };
  }
}
