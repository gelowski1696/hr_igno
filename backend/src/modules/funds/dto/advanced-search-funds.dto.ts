import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

function toNumericArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export class AdvancedSearchFundsDto {
  @ApiPropertyOptional({ description: 'Date lower bound (YYYY-MM-DD or ISO).' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date upper bound (YYYY-MM-DD or ISO).' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => toNumericArray(value), { toClassOnly: true })
  employeeId?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Legacy alias of employeeId.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => toNumericArray(value), { toClassOnly: true })
  employee_id?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => toNumericArray(value), { toClassOnly: true })
  storeId?: number[];

  @ApiPropertyOptional({ type: [Number], description: 'Legacy alias of storeId.' })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => toNumericArray(value), { toClassOnly: true })
  store_id?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
