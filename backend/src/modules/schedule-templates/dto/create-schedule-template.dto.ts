import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateScheduleTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Optional template work-day marker (YYYY-MM-DD).' })
  @IsOptional()
  @IsString()
  workDay?: string;

  @ApiProperty({ description: 'Template start time in HH:mm format.' })
  @IsString()
  startTime!: string;

  @ApiProperty({ description: 'Template end time in HH:mm format.' })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ description: 'Template break start time in HH:mm format.' })
  @IsOptional()
  @IsString()
  breakStart?: string;

  @ApiPropertyOptional({ description: 'Template break end time in HH:mm format.' })
  @IsOptional()
  @IsString()
  breakEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  breakDuration?: number;

  @ApiPropertyOptional({ description: 'Legacy employee IDs CSV (e.g. 1,2,3).' })
  @IsOptional()
  @IsString()
  legacyEmployeeIds?: string;
}

