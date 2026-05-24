import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class BulkScheduleDto {
  @ApiProperty()
  @IsString()
  dateFrom!: string;

  @ApiProperty()
  @IsString()
  dateTo!: string;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({ type: [String], description: 'Weekday names, e.g. Monday, Tuesday.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recurrenceDays?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  templateId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shiftName?: string;

  @ApiPropertyOptional({ description: 'Start time clock in HH:mm format.' })
  @IsOptional()
  @IsString()
  startClock?: string;

  @ApiPropertyOptional({ description: 'End time clock in HH:mm format.' })
  @IsOptional()
  @IsString()
  endClock?: string;

  @ApiPropertyOptional({ description: 'Break start clock in HH:mm format.' })
  @IsOptional()
  @IsString()
  breakStartClock?: string;

  @ApiPropertyOptional({ description: 'Break end clock in HH:mm format.' })
  @IsOptional()
  @IsString()
  breakEndClock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  breakDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employeeIds!: number[];

  @ApiPropertyOptional({ description: 'When true, creates schedules. When false, only returns preview and warnings.' })
  @IsOptional()
  @IsBoolean()
  apply?: boolean;
}

