import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLeaveBalanceDto } from './dto/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { LeaveBalancesService } from './leave-balances.service';

@ApiTags('leave-balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'leave-balances', version: '1' })
export class LeaveBalancesController {
  constructor(private readonly leaveBalances: LeaveBalancesService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.leaveBalances.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('none/employee')
  findEmployeesWithoutLeaveBalance() {
    return this.leaveBalances.employeesWithoutLeaveBalance();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('some/employee')
  findEmployeesWithLeaveBalance() {
    return this.leaveBalances.employeesWithLeaveBalance();
  }

  @Get('me')
  findMine(@CurrentUser() user?: CurrentUserPayload) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.leaveBalances.findOne(employeeId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':employeeId')
  findOne(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.leaveBalances.findOne(employeeId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateLeaveBalanceDto) {
    return this.leaveBalances.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':employeeId')
  update(@Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: UpdateLeaveBalanceDto) {
    return this.leaveBalances.update(employeeId, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':employeeId')
  remove(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.leaveBalances.remove(employeeId);
  }
}
