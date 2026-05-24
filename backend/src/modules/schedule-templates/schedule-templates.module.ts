import { Module } from '@nestjs/common';
import { ScheduleTemplatesController } from './schedule-templates.controller';
import { ScheduleTemplatesService } from './schedule-templates.service';

@Module({
  controllers: [ScheduleTemplatesController],
  providers: [ScheduleTemplatesService],
})
export class ScheduleTemplatesModule {}

