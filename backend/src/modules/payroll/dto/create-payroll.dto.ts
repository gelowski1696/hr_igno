import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PayrollSelectedPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cashAdvanceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  cash_advance_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  installmentPlan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  installment_plan?: number;
}

export class CreatePayrollDto {
  @ApiProperty()
  @IsInt()
  employeeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  employee_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  daysOfWork?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  days_of_work?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalRegularWage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total_regular_wage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overtimeHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overtime_hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lateHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  late_hours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overtimeAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overtime_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lateAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  late_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  allowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAllowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total_allowance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  addOnHoliday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  add_on_holiday?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sssDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sss_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  philhealthDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  philhealth_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pagibigDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pagibig_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  valeDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vale_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  charge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  credit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  loanDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  loan_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sssLoan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sssloan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pagibigLoan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pagibigloan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  philhealthLoan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  philhealthloan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  penaltyOrUndertime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  penalty_or_undertime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pondo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  endingFund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ending_fund?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  netAmountPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  net_amount_paid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  penaltyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  penalty_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  penaltyRemarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  penalty_remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bonusRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bonus_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bonusRemarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bonus_remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  otherDeduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  other_deduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payrollDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payroll_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payrollFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payroll_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payrollTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  payroll_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createby?: string;

  @ApiPropertyOptional({ type: [PayrollSelectedPaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollSelectedPaymentDto)
  selectedPayments?: PayrollSelectedPaymentDto[];
}
