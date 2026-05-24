import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional } from 'class-validator';

export class PayrollPreviewDto {
  @ApiProperty({ description: 'Start date of payroll window (YYYY-MM-DD).' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date of payroll window (YYYY-MM-DD).' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ type: [Number], description: 'Optional employee IDs to preview in batch.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employeeIds?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Legacy alias of employeeIds.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  employee_ids?: number[];

  @ApiPropertyOptional({ description: 'Optional single employee ID to preview.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;
}
