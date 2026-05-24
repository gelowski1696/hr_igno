import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class BulkGeneratePayrollDto {
  @ApiProperty({ description: 'Start date of payroll window (YYYY-MM-DD).' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'End date of payroll window (YYYY-MM-DD).' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ type: [Number], description: 'Employee IDs to generate payroll for.' })
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

  @ApiPropertyOptional({ type: [Number], description: 'Employee group IDs to include.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  groupIds?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Legacy alias of groupIds.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  group_ids?: number[];

  @ApiPropertyOptional({ description: 'Payment method applied to generated payroll rows.' })
  @IsOptional()
  @IsString()
  payMethod?: string;

  @ApiPropertyOptional({ description: 'Legacy alias of payMethod.' })
  @IsOptional()
  @IsString()
  paymethod?: string;

  @ApiPropertyOptional({ description: 'Target payroll status (defaults to DRAFT).' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Skip employees that already have payroll for the same period.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  skipExisting?: boolean;

  @ApiPropertyOptional({ description: 'Optional explicit creator username.' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Legacy alias of createdBy.' })
  @IsOptional()
  @IsString()
  createby?: string;
}
