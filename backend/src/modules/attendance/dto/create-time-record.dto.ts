import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceSource } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTimeRecordDto {
  @ApiProperty()
  @IsInt()
  employeeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timeIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  timeOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationOut?: string;

  @ApiPropertyOptional({ description: 'Manual entry date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({ description: 'Manual time-in (HH:mm)' })
  @IsOptional()
  @IsString()
  timeInClock?: string;

  @ApiPropertyOptional({ description: 'Manual time-out (HH:mm)' })
  @IsOptional()
  @IsString()
  timeOutClock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encoder?: string;

  @ApiPropertyOptional({ enum: AttendanceSource })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manualReason?: string;
}
