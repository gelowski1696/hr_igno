import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdvancedSearchFundsDto } from './dto/advanced-search-funds.dto';
import { CheckAtdDto } from './dto/check-atd.dto';
import { CreateFundsLogDto } from './dto/create-funds-log.dto';
import { UpdateFundsLogDto } from './dto/update-funds-log.dto';
import { FundsService } from './funds.service';

@ApiTags('funds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'funds', version: '1' })
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Post()
  create(@Body() dto: CreateFundsLogDto) {
    return this.funds.create(dto);
  }

  @Get()
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeIdRaw?: string,
    @Query('storeId') storeIdRaw?: string,
  ) {
    const employeeId = employeeIdRaw ? Number(employeeIdRaw) : undefined;
    const storeId = storeIdRaw ? Number(storeIdRaw) : undefined;
    return this.funds.findAll({
      from,
      to,
      action,
      status,
      employeeId: Number.isFinite(employeeId) ? employeeId : undefined,
      storeId: Number.isFinite(storeId) ? storeId : undefined,
    });
  }

  @Post('check-atd')
  checkAtd(@Body() dto: CheckAtdDto) {
    return this.funds.checkAtd(dto);
  }

  @Post('hrcheckatd')
  checkAtdLegacy(@Body() dto: CheckAtdDto) {
    return this.funds.checkAtd(dto);
  }

  @Post('advanced-search')
  advancedSearch(@Body() dto: AdvancedSearchFundsDto) {
    return this.funds.advancedSearch(dto);
  }

  @Post('advancesearch')
  advancedSearchLegacy(@Body() dto: AdvancedSearchFundsDto) {
    return this.funds.advancedSearch(dto);
  }

  @Get('employee/:employeeId')
  byEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.funds.byEmployee(employeeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.funds.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFundsLogDto) {
    return this.funds.update(id, dto);
  }

  @Patch(':id/release')
  release(@Param('id', ParseIntPipe) id: number, @Body() dto?: UpdateFundsLogDto) {
    return this.funds.release(id, dto);
  }

  @Patch('release/:id')
  releaseLegacy(@Param('id', ParseIntPipe) id: number, @Body() dto?: UpdateFundsLogDto) {
    return this.funds.release(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.funds.remove(id);
  }
}
