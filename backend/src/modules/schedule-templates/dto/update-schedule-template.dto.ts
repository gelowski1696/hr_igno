import { PartialType } from '@nestjs/swagger';
import { CreateScheduleTemplateDto } from './create-schedule-template.dto';

export class UpdateScheduleTemplateDto extends PartialType(CreateScheduleTemplateDto) {}

