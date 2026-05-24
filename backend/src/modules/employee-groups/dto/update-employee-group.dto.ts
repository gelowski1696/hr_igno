import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeGroupDto } from './create-employee-group.dto';

export class UpdateEmployeeGroupDto extends PartialType(CreateEmployeeGroupDto) {}

