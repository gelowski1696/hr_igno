import { Module } from '@nestjs/common';
import { LeaveBalancesModule } from '../leave-balances/leave-balances.module';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';

@Module({
  imports: [LeaveBalancesModule],
  controllers: [LeavesController],
  providers: [LeavesService],
})
export class LeavesModule {}
