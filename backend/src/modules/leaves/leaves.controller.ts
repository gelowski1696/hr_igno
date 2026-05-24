import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto } from './dto/update-leave.dto';
import { LeavesService } from './leaves.service';

@ApiTags('leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'leaves', version: '1' })
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  @Post()
  create(@Body() dto: CreateLeaveDto, @CurrentUser() user?: CurrentUserPayload) {
    if (user?.role === UserRole.EMPLOYEE) {
      if (!user.employeeId) {
        throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
      }
      return this.leaves.create({
        ...dto,
        employeeId: user.employeeId,
        status: dto.status || 'PENDING',
      });
    }

    return this.leaves.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.leaves.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('stats/requests')
  findPendingRequests() {
    return this.leaves.findPendingRequests();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.leaves.findByEmployee(employeeId);
  }

  @Get('me')
  findMine(@CurrentUser() user?: CurrentUserPayload) {
    const employeeId = user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenException('Signed-in account is not linked to an employee profile.');
    }
    return this.leaves.findByEmployee(employeeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leaves.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeaveDto) {
    return this.leaves.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.leaves.approve(id, user?.username || 'system');
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return this.leaves.reject(id, user?.username || 'system');
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leaves.remove(id);
  }
}
