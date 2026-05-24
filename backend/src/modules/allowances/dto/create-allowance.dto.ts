import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAllowanceDto {
  @ApiProperty()
  @IsInt()
  employeeId!: number;

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
  remarks?: string;
}
