import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('attendance-summary')
  attendanceSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.reports.attendanceSummary({ from, to, storeId, groupId, employeeId, status });
  }

  @Get('attendance-exceptions')
  attendanceExceptions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.reports.attendanceExceptions({ from, to, storeId, groupId, employeeId, status, type });
  }

  @Get('late-overtime')
  lateOvertime(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.reports.lateOvertime({ from, to, storeId, groupId, employeeId, status });
  }

  @Get('leave-utilization')
  leaveUtilization(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('leaveType') leaveType?: string,
  ) {
    return this.reports.leaveUtilization({ from, to, storeId, groupId, employeeId, status, leaveType });
  }

  @Get('payroll-cost')
  payrollCost(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('coverageFrom') coverageFrom?: string,
    @Query('coverageTo') coverageTo?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.reports.payrollCost({
      from,
      to,
      coverageFrom,
      coverageTo,
      storeId,
      groupId,
      employeeId,
      status,
    });
  }

  @Get('loans-aging')
  loansAging(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('storeId') storeId?: string,
    @Query('groupId') groupId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.reports.loansAging({ from, to, storeId, groupId, employeeId, status, type });
  }
}
