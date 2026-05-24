import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { filesUploadOptions } from './files-upload';
import { FilesService } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'files', version: '1' })
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  list(@Query() query: ListFilesQueryDto) {
    return this.files.list(query);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20, filesUploadOptions))
  upload(
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @Body() body: { module?: string; ownerType?: string; ownerId?: string },
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    return this.files.upload(uploadedFiles || [], body, user?.id ?? null);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.files.remove(id);
  }
}
