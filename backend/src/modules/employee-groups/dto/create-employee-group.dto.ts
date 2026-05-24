import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateEmployeeGroupDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'CSV of employee IDs to attach, e.g. 1,2,3' })
  @IsOptional()
  @IsString()
  memberIdsCsv?: string;
}

