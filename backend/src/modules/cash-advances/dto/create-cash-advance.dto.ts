import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCashAdvanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  employeeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  employee_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employee_code?: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalamount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  interests?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  atd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encoder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateIssued?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_issued?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  repaymentDue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  repayment_due?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  installmentPlan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  installment_plan?: number;
}
