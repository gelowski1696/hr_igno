import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeGroupDto } from './dto/create-employee-group.dto';
import { UpdateEmployeeGroupDto } from './dto/update-employee-group.dto';

@Injectable()
export class EmployeeGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseMemberIds(memberIdsCsv?: string) {
    if (memberIdsCsv === undefined) return undefined;
    const normalized = memberIdsCsv.trim();
    if (!normalized) return [];

    const ids = Array.from(
      new Set(
        normalized
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    if (!ids.length) {
      throw new BadRequestException('memberIdsCsv must contain valid employee IDs.');
    }

    return ids;
  }

  private async assertEmployeeIdsExist(employeeIds: number[]) {
    if (!employeeIds.length) return;

    const rows = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true },
    });
    const found = new Set(rows.map((row) => row.id));
    const missing = employeeIds.filter((id) => !found.has(id));
    if (missing.length) {
      throw new BadRequestException(`Some employee IDs do not exist: ${missing.join(', ')}`);
    }
  }

  private mapGroup(
    group: {
      id: number;
      name: string;
      members: Array<{
        employeeId: number;
        role: string | null;
        employee: {
          id: number;
          employeeCode: string;
          firstName: string;
          lastName: string;
          store: { id: number; code: string; name: string; area: string | null } | null;
        };
      }>;
    },
  ) {
    return {
      ...group,
      memberCount: group.members.length,
      memberIdsCsv: group.members.map((member) => member.employeeId).join(','),
    };
  }

  async create(dto: CreateEmployeeGroupDto) {
    const memberIds = this.parseMemberIds(dto.memberIdsCsv) ?? [];
    await this.assertEmployeeIdsExist(memberIds);

    const group = await this.prisma.employeeGroup.create({
      data: {
        name: dto.name,
      },
    });

    if (memberIds.length) {
      await this.prisma.employeeGroupMember.createMany({
        data: memberIds.map((employeeId) => ({
          employeeId,
          groupId: group.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(group.id);
  }

  async findAll() {
    const groups = await this.prisma.employeeGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          include: {
            employee: {
              include: {
                store: {
                  select: { id: true, code: true, name: true, area: true },
                },
              },
            },
          },
        },
      },
    });

    return groups.map((group) => this.mapGroup(group));
  }

  async findOne(id: number) {
    const group = await this.prisma.employeeGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            employee: {
              include: {
                store: {
                  select: { id: true, code: true, name: true, area: true },
                },
              },
            },
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Employee group not found');
    return this.mapGroup(group);
  }

  async update(id: number, dto: UpdateEmployeeGroupDto) {
    await this.findOne(id);

    const memberIds = this.parseMemberIds(dto.memberIdsCsv);
    if (memberIds !== undefined) {
      await this.assertEmployeeIdsExist(memberIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.employeeGroup.update({
        where: { id },
        data: {
          name: dto.name,
        },
      });

      if (memberIds !== undefined) {
        await tx.employeeGroupMember.deleteMany({ where: { groupId: id } });
        if (memberIds.length) {
          await tx.employeeGroupMember.createMany({
            data: memberIds.map((employeeId) => ({
              employeeId,
              groupId: id,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.employeeGroup.delete({ where: { id } });
    return { success: true };
  }
}
