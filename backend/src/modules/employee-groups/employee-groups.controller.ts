import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateEmployeeGroupDto } from './dto/create-employee-group.dto';
import { UpdateEmployeeGroupDto } from './dto/update-employee-group.dto';
import { EmployeeGroupsService } from './employee-groups.service';

@ApiTags('employee-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'employee-groups', version: '1' })
export class EmployeeGroupsController {
  constructor(private readonly employeeGroups: EmployeeGroupsService) {}

  @Post()
  create(@Body() dto: CreateEmployeeGroupDto) {
    return this.employeeGroups.create(dto);
  }

  @Get()
  findAll() {
    return this.employeeGroups.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeGroups.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeGroupDto) {
    return this.employeeGroups.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.employeeGroups.remove(id);
  }
}

