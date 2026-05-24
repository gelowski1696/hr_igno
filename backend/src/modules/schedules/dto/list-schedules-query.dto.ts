import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSchedulesQueryDto {
  @ApiPropertyOptional({ enum: ['flat', 'compact'], default: 'flat' })
  @IsOptional()
  @IsIn(['flat', 'compact'])
  mode?: 'flat' | 'compact';

  @ApiPropertyOptional({ description: 'Record limit per request.', default: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  take?: number;

  @ApiPropertyOptional({ description: 'Offset from start.', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ description: 'Optional search term for shift/day/status/notes.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter start date (YYYY-MM-DD).' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter end date (YYYY-MM-DD).' })
  @IsOptional()
  @IsString()
  to?: string;
}

