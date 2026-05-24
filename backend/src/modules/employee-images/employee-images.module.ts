import { Module } from '@nestjs/common';
import { EmployeeImagesController } from './employee-images.controller';
import { EmployeeImagesService } from './employee-images.service';

@Module({
  controllers: [EmployeeImagesController],
  providers: [EmployeeImagesService],
  exports: [EmployeeImagesService],
})
export class EmployeeImagesModule {}
