import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CashAdvancesService } from './cash-advances.service';
import { AdvancedSearchCashAdvanceDto } from './dto/advanced-search-cash-advance.dto';
import { CheckAtdDto } from './dto/check-atd.dto';
import { CreateCashAdvanceDto } from './dto/create-cash-advance.dto';
import { CreateCashAdvancePaymentDto } from './dto/create-payment.dto';
import { UpdateCashAdvanceDto } from './dto/update-cash-advance.dto';

@ApiTags('cash-advances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cash-advances', version: '1' })
export class CashAdvancesController {
  constructor(private readonly cashAdvances: CashAdvancesService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateCashAdvanceDto) {
    return this.cashAdvances.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const employeeId = employeeIdRaw ? Number(employeeIdRaw) : undefined;
    return this.cashAdvances.findAll({
      type,
      status,
      from,
      to,
      employeeId: Number.isFinite(employeeId) ? employeeId : undefined,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('loan/all')
  findAllLoans() {
    return this.cashAdvances.findAll({
      type: 'Loan',
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('benefit-loan/all')
  findAllBenefitLoans() {
    return this.cashAdvances.findAll({
      type: 'SSS Loan,PAG-IBIG Loan,PHILHEALTH Loan',
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('benefitloan/all')
  findAllBenefitLoansLegacyPath() {
    return this.cashAdvances.findAll({
      type: 'SSS Loan,PAG-IBIG Loan,PHILHEALTH Loan',
    });
  }

  @Get('employee/:employeeId')
  byEmployee(@Param('employeeId', ParseIntPipe) employeeId: number, @CurrentUser() user?: CurrentUserPayload) {
    if (user?.role === UserRole.EMPLOYEE && user.employeeId !== employeeId) {
      throw new ForbiddenException('Employee accounts can only view their own records.');
    }
    return this.cashAdvances.byEmployee(employeeId);
  }

  @Get('me')
  myCashAdvances(@CurrentUser() user?: CurrentUserPayload) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.cashAdvances.byEmployee(employeeId);
  }

  @Get('unpaid/:employeeId')
  unpaidByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('type') type?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (user?.role === UserRole.EMPLOYEE && user.employeeId !== employeeId) {
      throw new ForbiddenException('Employee accounts can only view their own records.');
    }
    return this.cashAdvances.unpaidByEmployee(employeeId, type);
  }

  @Get('me/unpaid')
  myUnpaid(@CurrentUser() user?: CurrentUserPayload, @Query('type') type?: string) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.cashAdvances.unpaidByEmployee(employeeId, type);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('check-atd')
  checkAtd(@Body() dto: CheckAtdDto) {
    return this.cashAdvances.checkAtd(dto.atd);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('hrcheckatd')
  checkAtdLegacy(@Body() dto: CheckAtdDto) {
    return this.cashAdvances.checkAtd(dto.atd);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('advanced-search')
  advancedSearch(@Body() dto: AdvancedSearchCashAdvanceDto) {
    return this.cashAdvances.advancedSearch(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('advancesearch')
  advancedSearchLegacy(@Body() dto: AdvancedSearchCashAdvanceDto) {
    return this.cashAdvances.advancedSearch(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('payment-history')
  paymentHistory(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const employeeId = employeeIdRaw ? Number(employeeIdRaw) : undefined;
    const resolvedStatus = status || 'PAID';
    return this.cashAdvances.paymentHistory({
      type,
      status: resolvedStatus,
      from,
      to,
      employeeId: Number.isFinite(employeeId) ? employeeId : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cashAdvances.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCashAdvanceDto) {
    return this.cashAdvances.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cashAdvances.remove(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/payments')
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCashAdvancePaymentDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.cashAdvances.addPayment(id, dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: CurrentUserPayload) {
    return this.cashAdvances.approve(id, user);
  }

  @Get(':id/payments')
  payments(@Param('id', ParseIntPipe) id: number) {
    return this.cashAdvances.payments(id);
  }
}
