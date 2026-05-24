import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BulkGeneratePayrollDto } from './dto/bulk-generate-payroll.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollPreviewDto } from './dto/payroll-preview.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { PayrollService } from './payroll.service';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payroll', version: '1' })
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreatePayrollDto) {
    return this.payroll.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.payroll.findAll({ from, to });
  }

  @Get('me')
  findMine(@CurrentUser() user?: CurrentUserPayload, @Query('from') from?: string, @Query('to') to?: string) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.payroll.findByEmployee(employeeId, { from, to });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('preview')
  preview(@Body() dto: PayrollPreviewDto) {
    return this.payroll.preview(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('generate')
  generate(@Body() dto: PayrollPreviewDto) {
    return this.payroll.preview(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('bulk-generate')
  bulkGenerate(@Body() dto: BulkGeneratePayrollDto, @CurrentUser() user: CurrentUserPayload) {
    return this.payroll.generateBulk(dto, user?.username || 'system');
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePayrollDto) {
    return this.payroll.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/release')
  release(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.payroll.release(id, user?.username || 'system');
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.remove(id);
  }
}
