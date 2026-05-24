import { PartialType } from '@nestjs/swagger';
import { CreateFundsLogDto } from './create-funds-log.dto';

export class UpdateFundsLogDto extends PartialType(CreateFundsLogDto) {}

