import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLeaveDto {
  @ApiProperty()
  @IsInt()
  employeeId!: number;

  @ApiProperty()
  @IsString()
  leaveType!: string;

  @ApiProperty()
  @IsDateString()
  startDate!: string;

  @ApiProperty()
  @IsDateString()
  endDate!: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional({ description: 'PENDING, APPROVED, REJECTED, or CANCELLED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  leaveRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvedBy?: string;
}
