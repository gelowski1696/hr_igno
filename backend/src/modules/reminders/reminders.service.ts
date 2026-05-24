import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        title: dto.title,
        description: dto.description,
        frequency: dto.frequency || 'DAILY',
        tasks: {
          create: (dto.tasks || []).map((task, index) => ({
            name: task.name,
            sortOrder: index,
          })),
        },
      },
      include: { tasks: true },
    });
  }

  findAll() {
    return this.prisma.reminder.findMany({ orderBy: { createdAt: 'desc' }, include: { tasks: true } });
  }

  async remove(id: number) {
    await this.prisma.reminder.delete({ where: { id } });
    return { success: true };
  }
}

