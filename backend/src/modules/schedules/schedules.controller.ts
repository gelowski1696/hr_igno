import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ListSchedulesQueryDto } from './dto/list-schedules-query.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'schedules', version: '1' })
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto) {
    return this.schedules.create(dto);
  }

  @Get()
  findAll(@Query() query: ListSchedulesQueryDto) {
    return this.schedules.findAll(query);
  }

  @Post('bulk/preview')
  previewBulk(@Body() dto: BulkScheduleDto) {
    return this.schedules.previewOrApplyBulk({ ...dto, apply: false });
  }

  @Post('bulk/apply')
  applyBulk(@Body() dto: BulkScheduleDto) {
    return this.schedules.previewOrApplyBulk({ ...dto, apply: true });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schedules.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScheduleDto) {
    return this.schedules.update(id, dto);
  }

  @Post(':id/employees/:employeeId')
  assignEmployee(@Param('id', ParseIntPipe) id: number, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.schedules.assignEmployee(id, employeeId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schedules.remove(id);
  }
}
