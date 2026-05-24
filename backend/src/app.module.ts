import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllowancesModule } from './modules/allowances/allowances.module';
import { AuthModule } from './modules/auth/auth.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CashAdvancesModule } from './modules/cash-advances/cash-advances.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { EmployeeGroupsModule } from './modules/employee-groups/employee-groups.module';
import { EmployeeImagesModule } from './modules/employee-images/employee-images.module';
import { FundsModule } from './modules/funds/funds.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { LeaveBalancesModule } from './modules/leave-balances/leave-balances.module';
import { LeaveTypesModule } from './modules/leave-types/leave-types.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RemoteClockModule } from './modules/remote-clock/remote-clock.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { ScheduleTemplatesModule } from './modules/schedule-templates/schedule-templates.module';
import { StoresModule } from './modules/stores/stores.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    StoresModule,
    EmployeesModule,
    EmployeeImagesModule,
    EmployeeGroupsModule,
    AttendanceModule,
    FilesModule,
    SchedulesModule,
    ScheduleTemplatesModule,
    LeaveBalancesModule,
    LeavesModule,
    LeaveTypesModule,
    PayrollModule,
    CashAdvancesModule,
    FundsModule,
    AllowancesModule,
    RemindersModule,
    RemoteClockModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
