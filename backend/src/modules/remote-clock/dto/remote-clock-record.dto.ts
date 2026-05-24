import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class RemoteClockRecordDto {
  @Type(() => Number)
  @IsInt()
  employeeId!: number;

  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  @IsNotEmpty()
  location!: string;
}
