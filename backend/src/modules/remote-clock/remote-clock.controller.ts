import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RemoteClockRecordDto } from './dto/remote-clock-record.dto';
import { RemoteClockService } from './remote-clock.service';
import {
  remoteClockUploadOptions,
  uploadedRemoteClockPath,
} from './remote-clock-upload';

@ApiTags('remote-clock')
@Public()
@Controller({ path: 'remote-clock', version: '1' })
export class RemoteClockController {
  constructor(@Inject(RemoteClockService) private readonly remoteClock: RemoteClockService) {}

  @Get('employees/:employeeCode')
  findEmployeeByCode(@Param('employeeCode') employeeCode: string) {
    return this.remoteClock.findEmployeeByCode(employeeCode);
  }

  @Get('location/resolve')
  resolveLocation(@Query('location') location: string) {
    return this.remoteClock.resolveLocation(location);
  }

  @Post('time-in')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', remoteClockUploadOptions))
  clockIn(@Body() dto: RemoteClockRecordDto, @UploadedFile() file?: Express.Multer.File) {
    return this.remoteClock.clockIn({
      employeeId: dto.employeeId,
      location: dto.location,
      imagePath: uploadedRemoteClockPath(file),
    });
  }

  @Post('time-out')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', remoteClockUploadOptions))
  clockOut(@Body() dto: RemoteClockRecordDto, @UploadedFile() file?: Express.Multer.File) {
    return this.remoteClock.clockOut({
      employeeId: dto.employeeId,
      location: dto.location,
      imagePath: uploadedRemoteClockPath(file),
    });
  }
}
