import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceSource, UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttendanceService } from './attendance.service';
import { CreateTimeRecordDto } from './dto/create-time-record.dto';
import { UpdateTimeRecordDto } from './dto/update-time-record.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post()
  create(@Body() dto: CreateTimeRecordDto, @CurrentUser() user?: CurrentUserPayload) {
    return this.attendance.create(dto, user?.username);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string, @Query('source') source?: AttendanceSource) {
    return this.attendance.findAll({ from, to, source });
  }

  @Get('me')
  findMine(@CurrentUser() user?: CurrentUserPayload, @Query('from') from?: string, @Query('to') to?: string) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.attendance.findByEmployee(employeeId, { from, to });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('today')
  findToday(@Query('from') from?: string, @Query('to') to?: string) {
    return this.attendance.findToday({ from, to });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('no-timeout')
  findNoTimeOut(@Query('from') from?: string, @Query('to') to?: string) {
    return this.attendance.findNoTimeOut({ from, to });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('no-timein')
  findNoTimeIn() {
    return this.attendance.findNoTimeIn();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('stats/today')
  todayStats() {
    return this.attendance.todayStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.attendance.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTimeRecordDto) {
    return this.attendance.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendance.remove(id);
  }
}
