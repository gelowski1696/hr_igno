import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AllowancesModule } from './modules/allowances/allowances.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CashAdvancesModule } from './modules/cash-advances/cash-advances.module';
import { FundsModule } from './modules/funds/funds.module';
import { LeaveBalancesModule } from './modules/leave-balances/leave-balances.module';
import { LeaveTypesModule } from './modules/leave-types/leave-types.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SchedulesModule } from './modules/schedules/schedules.module';

describe('AppModule HR domains', () => {
  it('registers the main HR domain modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef).toBeDefined();
    expect(moduleRef.select(AttendanceModule)).toBeDefined();
    expect(moduleRef.select(SchedulesModule)).toBeDefined();
    expect(moduleRef.select(LeavesModule)).toBeDefined();
    expect(moduleRef.select(LeaveBalancesModule)).toBeDefined();
    expect(moduleRef.select(LeaveTypesModule)).toBeDefined();
    expect(moduleRef.select(PayrollModule)).toBeDefined();
    expect(moduleRef.select(CashAdvancesModule)).toBeDefined();
    expect(moduleRef.select(FundsModule)).toBeDefined();
    expect(moduleRef.select(AllowancesModule)).toBeDefined();
    expect(moduleRef.select(RemindersModule)).toBeDefined();
  });
});
