import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  shiftName!: string;

  @ApiProperty()
  @IsString()
  workDay!: string;

  @ApiProperty()
  @IsDateString()
  startTime!: string;

  @ApiProperty()
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  breakStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  breakEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  breakDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: RecurrenceType })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recurrenceEnd?: string;

  @ApiPropertyOptional({ description: 'Comma-separated weekday list.' })
  @IsOptional()
  @IsString()
  recurrenceDays?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Employee IDs to assign after schedule creation.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employeeIds?: number[];
}
