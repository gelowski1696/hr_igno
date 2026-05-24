import { Module } from '@nestjs/common';
import { CashAdvancesController } from './cash-advances.controller';
import { CashAdvancesService } from './cash-advances.service';

@Module({
  controllers: [CashAdvancesController],
  providers: [CashAdvancesService],
})
export class CashAdvancesModule {}

