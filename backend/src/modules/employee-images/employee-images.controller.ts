import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EmployeeImagesService } from './employee-images.service';
import {
  employeeImageFieldNames,
  employeeImagesUploadOptions,
  type EmployeeImageFieldName,
} from './employee-images-upload';

type UploadFiles = Partial<Record<EmployeeImageFieldName, Express.Multer.File[]>>;

const imageFieldConfig = employeeImageFieldNames.map((name) => ({
  name,
  maxCount: 1,
}));

@ApiTags('employee-images')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'employee-images', version: '1' })
export class EmployeeImagesController {
  constructor(private readonly employeeImages: EmployeeImagesService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':employeeId')
  findByEmployeeId(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.employeeImages.findByEmployeeId(employeeId);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post(':employeeId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor(imageFieldConfig, employeeImagesUploadOptions))
  create(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @UploadedFiles() files: UploadFiles,
  ) {
    return this.employeeImages.upsert(employeeId, files || {});
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put(':employeeId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor(imageFieldConfig, employeeImagesUploadOptions))
  update(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @UploadedFiles() files: UploadFiles,
  ) {
    return this.employeeImages.upsert(employeeId, files || {});
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':employeeId')
  remove(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.employeeImages.remove(employeeId);
  }
}
