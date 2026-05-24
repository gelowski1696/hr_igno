import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AllowancesService } from './allowances.service';
import { CreateAllowanceDto } from './dto/create-allowance.dto';
import { UpdateAllowanceDto } from './dto/update-allowance.dto';

@ApiTags('allowances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'allowances', version: '1' })
export class AllowancesController {
  constructor(private readonly allowances: AllowancesService) {}

  @Post()
  create(@Body() dto: CreateAllowanceDto) {
    return this.allowances.create(dto);
  }

  @Get()
  findAll() {
    return this.allowances.findAll();
  }

  @Get('employee/:employeeId')
  byEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.allowances.byEmployee(employeeId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAllowanceDto) {
    return this.allowances.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.allowances.remove(id);
  }
}
