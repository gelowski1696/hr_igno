import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFundsLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional({ description: 'Legacy alias of employeeId.' })
  @IsOptional()
  @IsInt()
  employee_id?: number;

  @ApiProperty()
  @IsString()
  action!: string;

  @ApiProperty()
  @IsString()
  type!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encoder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  atd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cashBy?: string;

  @ApiPropertyOptional({ description: 'Legacy alias of cashBy.' })
  @IsOptional()
  @IsString()
  cashby?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Legacy alias of paymentMethod.' })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Date issued / created at (ISO string).' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Legacy alias of createdAt.' })
  @IsOptional()
  @IsString()
  created_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
