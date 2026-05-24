import 'dotenv/config';
import Database from 'better-sqlite3';
import { PaymentStatus, PrismaClient } from '@prisma/client';
import { PasswordService } from '../src/modules/auth/password.service';
import {
  coerceDate,
  coerceDecimalString,
  coerceInteger,
  mapLegacyAccountStatus,
  mapLegacyEmployeeStatus,
  mapLegacyLeaveStatus,
  mapLegacyPaymentStatus,
  mapLegacyPayrollStatus,
  mapLegacyRecurrenceType,
  mapLegacyUserRole,
  stripApiPrefix,
} from './migration-utils';

const prisma = new PrismaClient();
const passwords = new PasswordService();

type LegacyRow = Record<string, unknown>;

type Options = {
  sqlitePath: string;
  dryRun: boolean;
};

const LEGACY_TABLES = [
  'Stores',
  'Employees',
  'UserAccounts',
  'EmployeeGroups',
  'EmployeeGroupPivot',
  'EmployeeImages',
  'TimeRecords',
  'WorkSchedules',
  'ScheduleTemplates',
  'EmployeeWorkSchedule',
  'EmployeeLeaves',
  'EmployeeLeaveBalance',
  'CashAdvance',
  'CashAdvancePayments',
  'Payroll',
  'SelectedPayments',
  'Disputes',
  'Allowance',
  'FundsLog',
  'reminders',
  'reminder_tasks',
] as const;

const SQLITE_SYSTEM_TABLES = new Set(['_prisma_migrations', 'sqlite_sequence']);

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const sqliteFlag = args.findIndex((arg) => arg === '--sqlite');
  const sqlitePath =
    sqliteFlag >= 0 && args[sqliteFlag + 1]
      ? args[sqliteFlag + 1]
      : '../backend_old/prisma/db/hrdb.sqlite';

  return {
    sqlitePath,
    dryRun: args.includes('--dry-run'),
  };
}

function readRows(db: Database.Database, table: string): LegacyRow[] {
  const exists = db
    .prepare("select name from sqlite_master where type = 'table' and name = ?")
    .get(table);
  if (!exists) return [];
  return db.prepare(`select * from "${table}"`).all() as LegacyRow[];
}

function readTableNames(db: Database.Database): string[] {
  return db
    .prepare("select name from sqlite_master where type = 'table' order by name")
    .all()
    .map((row: { name: string }) => row.name);
}

function nonNull<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value;
}

async function importStores(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.store_id);
    if (!id) continue;
    await prisma.store.upsert({
      where: { id },
      update: {
        code: String(row.store_code || `STORE-${id}`),
        name: String(row.store_name || `Store ${id}`),
        address: row.store_address ? String(row.store_address) : null,
        area: row.store_area ? String(row.store_area) : null,
        contactNumber: row.store_contact_number ? String(row.store_contact_number) : null,
        contactPerson: row.store_contact_person ? String(row.store_contact_person) : null,
        contactPersonNumber: row.contact_person_number ? String(row.contact_person_number) : null,
      },
      create: {
        id,
        code: String(row.store_code || `STORE-${id}`),
        name: String(row.store_name || `Store ${id}`),
        address: row.store_address ? String(row.store_address) : null,
        area: row.store_area ? String(row.store_area) : null,
        contactNumber: row.store_contact_number ? String(row.store_contact_number) : null,
        contactPerson: row.store_contact_person ? String(row.store_contact_person) : null,
        contactPersonNumber: row.contact_person_number ? String(row.contact_person_number) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importEmployees(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.employee_id);
    if (!id) continue;
    await prisma.employee.upsert({
      where: { id },
      update: {
        storeId: coerceInteger(row.store_id),
        employeeCode: String(row.employee_code || `EMP-${id}`),
        firstName: String(row.first_name || 'Unknown'),
        middleName: row.middle_name ? String(row.middle_name) : null,
        lastName: String(row.last_name || 'Employee'),
        birthdate: coerceDate(row.birthdate),
        age: coerceInteger(row.age),
        gender: row.gender ? String(row.gender) : null,
        religion: row.religion ? String(row.religion) : null,
        address: row.address ? String(row.address) : null,
        phone: row.phone ? String(row.phone) : null,
        email: row.email ? String(row.email) : null,
        sssId: row.sssid ? String(row.sssid) : null,
        sssContribution: coerceDecimalString(row.ssscontri),
        philhealthId: row.philhealthid ? String(row.philhealthid) : null,
        philhealthContribution: coerceDecimalString(row.philhcontri),
        pagibigId: row.pagibigid ? String(row.pagibigid) : null,
        pagibigContribution: coerceDecimalString(row.pagibigcontri),
        hireDate: coerceDate(row.hire_date),
        endDate: coerceDate(row.end_date),
        position: row.position ? String(row.position) : null,
        salary: coerceDecimalString(row.salary),
        funds: coerceDecimalString(row.funds),
        emergencyContactName: row.emcontactname ? String(row.emcontactname) : null,
        emergencyContactNumber: row.emcontactnum ? String(row.emcontactnum) : null,
        status: mapLegacyEmployeeStatus(row.status),
        hasAssets: String(row.assets || '').toUpperCase() === 'Y',
        assetRemarks: row.assetremarks ? String(row.assetremarks) : null,
      },
      create: {
        id,
        storeId: coerceInteger(row.store_id),
        employeeCode: String(row.employee_code || `EMP-${id}`),
        firstName: String(row.first_name || 'Unknown'),
        middleName: row.middle_name ? String(row.middle_name) : null,
        lastName: String(row.last_name || 'Employee'),
        birthdate: coerceDate(row.birthdate),
        age: coerceInteger(row.age),
        gender: row.gender ? String(row.gender) : null,
        religion: row.religion ? String(row.religion) : null,
        address: row.address ? String(row.address) : null,
        phone: row.phone ? String(row.phone) : null,
        email: row.email ? String(row.email) : null,
        sssId: row.sssid ? String(row.sssid) : null,
        sssContribution: coerceDecimalString(row.ssscontri),
        philhealthId: row.philhealthid ? String(row.philhealthid) : null,
        philhealthContribution: coerceDecimalString(row.philhcontri),
        pagibigId: row.pagibigid ? String(row.pagibigid) : null,
        pagibigContribution: coerceDecimalString(row.pagibigcontri),
        hireDate: coerceDate(row.hire_date),
        endDate: coerceDate(row.end_date),
        position: row.position ? String(row.position) : null,
        salary: coerceDecimalString(row.salary),
        funds: coerceDecimalString(row.funds),
        emergencyContactName: row.emcontactname ? String(row.emcontactname) : null,
        emergencyContactNumber: row.emcontactnum ? String(row.emcontactnum) : null,
        status: mapLegacyEmployeeStatus(row.status),
        hasAssets: String(row.assets || '').toUpperCase() === 'Y',
        assetRemarks: row.assetremarks ? String(row.assetremarks) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importUsers(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.user_id);
    if (!id) continue;
    const legacyPassword = String(row.password || 'ChangeMe123!');
    await prisma.userAccount.upsert({
      where: { id },
      update: {
        employeeId: coerceInteger(row.employee_id),
        employeeCode: row.employee_code ? String(row.employee_code) : null,
        storeId: coerceInteger(row.store_id),
        storeCode: row.store_code ? String(row.store_code) : null,
        username: String(row.username || `user-${id}`),
        passwordHash: await passwords.hash(legacyPassword),
        legacyPassword,
        role: mapLegacyUserRole(row.menurole || row.role),
        menuRole: row.menurole ? String(row.menurole) : null,
        status: mapLegacyAccountStatus(row.status),
        mustChangePassword: true,
      },
      create: {
        id,
        employeeId: coerceInteger(row.employee_id),
        employeeCode: row.employee_code ? String(row.employee_code) : null,
        storeId: coerceInteger(row.store_id),
        storeCode: row.store_code ? String(row.store_code) : null,
        username: String(row.username || `user-${id}`),
        passwordHash: await passwords.hash(legacyPassword),
        legacyPassword,
        role: mapLegacyUserRole(row.menurole || row.role),
        menuRole: row.menurole ? String(row.menurole) : null,
        status: mapLegacyAccountStatus(row.status),
        mustChangePassword: true,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importEmployeeGroups(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.group_id);
    if (!id) continue;
    await prisma.employeeGroup.upsert({
      where: { id },
      update: { name: String(row.group_name || `Group ${id}`) },
      create: {
        id,
        name: String(row.group_name || `Group ${id}`),
      },
    });
  }
}

async function importEmployeeGroupMembers(rows: LegacyRow[]) {
  const employeeIds = new Set((await prisma.employee.findMany({ select: { id: true } })).map((row) => row.id));
  const groupIds = new Set((await prisma.employeeGroup.findMany({ select: { id: true } })).map((row) => row.id));
  for (const row of rows) {
    const employeeId = coerceInteger(row.employee_id);
    const groupId = coerceInteger(row.group_id);
    if (!employeeId || !groupId) continue;
    if (!employeeIds.has(employeeId) || !groupIds.has(groupId)) continue;
    await prisma.employeeGroupMember.upsert({
      where: { employeeId_groupId: { employeeId, groupId } },
      update: { role: row.role ? String(row.role) : null },
      create: {
        employeeId,
        groupId,
        role: row.role ? String(row.role) : null,
      },
    });
  }
}

async function importEmployeeImages(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.image_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.employeeImage.upsert({
      where: { employeeId },
      update: {
        validId1: stripApiPrefix(row.valid_id_1),
        validId2: stripApiPrefix(row.valid_id_2),
        mugshot1: stripApiPrefix(row.mugshot_1),
        mugshot2: stripApiPrefix(row.mugshot_2),
        mugshot3: stripApiPrefix(row.mugshot_3),
        mugshot4: stripApiPrefix(row.mugshot_4),
      },
      create: {
        id,
        employeeId,
        validId1: stripApiPrefix(row.valid_id_1),
        validId2: stripApiPrefix(row.valid_id_2),
        mugshot1: stripApiPrefix(row.mugshot_1),
        mugshot2: stripApiPrefix(row.mugshot_2),
        mugshot3: stripApiPrefix(row.mugshot_3),
        mugshot4: stripApiPrefix(row.mugshot_4),
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importTimeRecords(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.time_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.timeRecord.upsert({
      where: { id },
      update: {},
      create: {
        id,
        employeeId,
        timeIn: coerceDate(row.time_in),
        timeOut: coerceDate(row.time_out),
        locationIn: row.location ? String(row.location) : null,
        locationOut: row.locationout ? String(row.locationout) : null,
        timeInImage: stripApiPrefix(row.time_in_image),
        timeOutImage: stripApiPrefix(row.time_out_image),
        encoder: row.encoder ? String(row.encoder) : null,
        source: String(row.ismanual || '').toUpperCase() === 'Y' ? 'ADMIN_MANUAL' : 'REMOTE_CLOCK',
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importWorkSchedules(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.schedule_id);
    const startTime = coerceDate(row.start_time);
    const endTime = coerceDate(row.end_time);
    if (!id || !startTime || !endTime) continue;
    await prisma.workSchedule.upsert({
      where: { id },
      update: {},
      create: {
        id,
        shiftName: String(row.shift_name || `Shift ${id}`),
        workDay: String(row.work_day || ''),
        startTime,
        endTime,
        breakStart: coerceDate(row.break_start),
        breakEnd: coerceDate(row.break_end),
        duration: row.duration === null || row.duration === undefined ? null : coerceDecimalString(row.duration),
        breakDuration:
          row.break_duration === null || row.break_duration === undefined
            ? null
            : coerceDecimalString(row.break_duration),
        status: String(row.status || 'ACTIVE'),
        notes: row.notes ? String(row.notes) : null,
        recurrenceType: mapLegacyRecurrenceType(row.recurrence_type),
        recurrenceEnd: coerceDate(row.recurrence_end),
        recurrenceDays: row.recurrence_days ? String(row.recurrence_days) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importScheduleTemplates(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.template_id);
    const startTime = coerceDate(row.start_time);
    const endTime = coerceDate(row.end_time);
    if (!id || !startTime || !endTime) continue;
    await prisma.scheduleTemplate.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: String(row.template_name || `Template ${id}`),
        description: row.template_desc ? String(row.template_desc) : null,
        workDay: row.work_day ? String(row.work_day) : null,
        startTime,
        endTime,
        breakStart: coerceDate(row.break_start),
        breakEnd: coerceDate(row.break_end),
        duration: row.duration === null || row.duration === undefined ? null : coerceDecimalString(row.duration),
        breakDuration:
          row.break_duration === null || row.break_duration === undefined
            ? null
            : coerceDecimalString(row.break_duration),
        legacyEmployeeIds: row.employeeids ? String(row.employeeids) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importEmployeeWorkSchedules(rows: LegacyRow[]) {
  const employeeIds = new Set((await prisma.employee.findMany({ select: { id: true } })).map((row) => row.id));
  const scheduleIds = new Set((await prisma.workSchedule.findMany({ select: { id: true } })).map((row) => row.id));
  const templateIds = new Set((await prisma.scheduleTemplate.findMany({ select: { id: true } })).map((row) => row.id));
  for (const row of rows) {
    const employeeId = coerceInteger(row.employee_id);
    const scheduleId = coerceInteger(row.schedule_id);
    if (!employeeId || !scheduleId) continue;
    if (!employeeIds.has(employeeId) || !scheduleIds.has(scheduleId)) continue;
    const templateId = coerceInteger(row.template_id);
    await prisma.employeeWorkSchedule.upsert({
      where: { employeeId_scheduleId: { employeeId, scheduleId } },
      update: {
        templateId: templateId && templateIds.has(templateId) ? templateId : null,
      },
      create: {
        employeeId,
        scheduleId,
        templateId: templateId && templateIds.has(templateId) ? templateId : null,
      },
    });
  }
}

async function importLeaves(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.leave_id);
    const employeeId = coerceInteger(row.employee_id);
    const startDate = coerceDate(row.start_date);
    const endDate = coerceDate(row.end_date);
    if (!id || !employeeId || !startDate || !endDate) continue;
    await prisma.employeeLeave.upsert({
      where: { id },
      update: {},
      create: {
        id,
        employeeId,
        leaveType: String(row.leave_type || 'General'),
        startDate,
        endDate,
        duration: coerceInteger(row.duration) || 0,
        status: mapLegacyLeaveStatus(row.status),
        reason: row.reason ? String(row.reason) : null,
        leaveRate: coerceDecimalString(row.leave_rate),
        approvedBy: row.approved_by ? String(row.approved_by) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importLeaveBalances(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.balance_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.employeeLeaveBalance.upsert({
      where: { id },
      update: {},
      create: {
        id,
        employeeId,
        leaveType: String(row.leave_type || 'General'),
        totalLeaves: coerceInteger(row.total_leaves) || 0,
        usedLeaves: coerceInteger(row.used_leaves) || 0,
        remainingLeaves: coerceInteger(row.remaining_leaves) || 0,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importCashAdvances(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.cash_advance_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.cashAdvance.upsert({
      where: { id },
      update: {},
      create: {
        id,
        referenceNumber: row.refnum ? String(row.refnum) : null,
        atd: row.atd ? String(row.atd) : null,
        employeeId,
        employeeCode: row.employee_code ? String(row.employee_code) : null,
        amount: coerceDecimalString(row.amount),
        totalAmount: coerceDecimalString(row.totalamount),
        reason: row.reason ? String(row.reason) : null,
        paymentMethod: row.payment_method ? String(row.payment_method) : null,
        encoder: row.encoder ? String(row.encoder) : null,
        type: row.type ? String(row.type) : null,
        dateIssued: nonNull(coerceDate(row.date_issued), new Date()),
        repaymentDue: coerceDate(row.repayment_due),
        installmentPlan: coerceInteger(row.installment_plan) || 1,
        totalPaid: coerceDecimalString(row.total_paid),
        balance: coerceDecimalString(row.balance),
        interests: coerceDecimalString(row.interests),
        status: mapLegacyPaymentStatus(row.status),
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importCashAdvancePayments(rows: LegacyRow[]) {
  const cashAdvanceIds = new Set((await prisma.cashAdvance.findMany({ select: { id: true } })).map((row) => row.id));
  for (const row of rows) {
    const id = coerceInteger(row.payment_id);
    const cashAdvanceId = coerceInteger(row.cash_advance_id);
    if (!id || !cashAdvanceId) continue;
    if (!cashAdvanceIds.has(cashAdvanceId)) continue;
    await prisma.cashAdvancePayment.upsert({
      where: { id },
      update: {},
      create: {
        id,
        cashAdvanceId,
        paymentDate: nonNull(coerceDate(row.payment_date), new Date()),
        amountPaid: coerceDecimalString(row.amount_paid),
        paymentMethod: row.payment_method ? String(row.payment_method) : null,
        type: row.type ? String(row.type) : null,
        status:
          row.status === null || row.status === undefined || String(row.status).trim() === ''
            ? PaymentStatus.PAID
            : mapLegacyPaymentStatus(row.status),
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importPayroll(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.payroll_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.payroll.upsert({
      where: { id },
      update: {},
      create: {
        id,
        employeeId,
        daysOfWork: coerceDecimalString(row.days_of_work),
        rate: coerceDecimalString(row.rate),
        totalRegularWage: coerceDecimalString(row.total_regular_wage),
        overtimeHours: coerceDecimalString(row.overtime_hours),
        lateHours: coerceDecimalString(row.late_hours),
        overtimeAmount: coerceDecimalString(row.overtime_amount),
        lateAmount: coerceDecimalString(row.late_amount),
        allowance: coerceDecimalString(row.allowance),
        totalAllowance: coerceDecimalString(row.total_allowance),
        addOnHoliday: coerceDecimalString(row.add_on_holiday),
        totalAmount: coerceDecimalString(row.total_amount),
        sssDeduction: coerceDecimalString(row.sss_deduction),
        philhealthDeduction: coerceDecimalString(row.philhealth_deduction),
        pagibigDeduction: coerceDecimalString(row.pagibig_deduction),
        valeDeduction: coerceDecimalString(row.vale_deduction),
        charge: coerceDecimalString(row.charge),
        credit: coerceDecimalString(row.credit),
        loanDeduction: coerceDecimalString(row.loan_deduction),
        penaltyOrUndertime: coerceDecimalString(row.penalty_or_undertime),
        pondo: coerceDecimalString(row.pondo),
        sssLoan: coerceDecimalString(row.sssloan),
        pagibigLoan: coerceDecimalString(row.pagibigloan),
        philhealthLoan: coerceDecimalString(row.philhealthloan),
        endingFund: coerceDecimalString(row.ending_fund),
        netAmountPaid: coerceDecimalString(row.net_amount_paid),
        payrollDate: nonNull(coerceDate(row.payroll_date), new Date()),
        payrollFrom: coerceDate(row.payroll_from),
        payrollTo: coerceDate(row.payroll_to),
        penaltyRate: coerceDecimalString(row.penalty_rate),
        penaltyRemarks: row.penalty_remarks ? String(row.penalty_remarks) : null,
        bonusRate: coerceDecimalString(row.bonus_rate),
        bonusRemarks: row.bonus_remarks ? String(row.bonus_remarks) : null,
        otherDeduction: coerceDecimalString(row.other_deduction),
        payMethod: row.paymethod ? String(row.paymethod) : null,
        createdBy: row.createby ? String(row.createby) : null,
        status: mapLegacyPayrollStatus(row.status),
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importSelectedPayments(rows: LegacyRow[]) {
  const payrollIds = new Set((await prisma.payroll.findMany({ select: { id: true } })).map((row) => row.id));
  for (const row of rows) {
    const id = coerceInteger(row.id);
    const payrollId = coerceInteger(row.payroll_id);
    if (!id || !payrollId) continue;
    if (!payrollIds.has(payrollId)) continue;
    await prisma.selectedPayment.upsert({
      where: { id },
      update: {},
      create: {
        id,
        payrollId,
        type: String(row.type || 'payment'),
        date: nonNull(coerceDate(row.date), new Date()),
        amount: coerceDecimalString(row.amount),
        cashAdvanceId: coerceInteger(row.cash_advance_id),
        installmentPlan: coerceInteger(row.installment_plan) || 1,
      },
    });
  }
}

async function importDisputes(rows: LegacyRow[]) {
  const payrollIds = new Set((await prisma.payroll.findMany({ select: { id: true } })).map((row) => row.id));
  const employeeIds = new Set((await prisma.employee.findMany({ select: { id: true } })).map((row) => row.id));
  const timeRecordIds = new Set((await prisma.timeRecord.findMany({ select: { id: true } })).map((row) => row.id));
  for (const row of rows) {
    const id = coerceInteger(row.id);
    const payrollId = coerceInteger(row.payroll_id);
    const timeRecordId = coerceInteger(row.time_id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !payrollId || !timeRecordId || !employeeId) continue;
    if (!payrollIds.has(payrollId) || !employeeIds.has(employeeId) || !timeRecordIds.has(timeRecordId)) continue;
    await prisma.dispute.upsert({
      where: { id },
      update: {},
      create: {
        id,
        payrollId,
        timeRecordId,
        employeeId,
        status: String(row.status || 'PENDING'),
        scheduleDate: String(row.schedDate || ''),
        date: nonNull(coerceDate(row.date), new Date()),
      },
    });
  }
}

async function importAllowances(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.allowance.upsert({
      where: { id },
      update: {},
      create: {
        id,
        atd: row.atd ? String(row.atd) : null,
        employeeId,
        type: String(row.type || 'allowance'),
        amount: coerceDecimalString(row.amount),
        encoder: String(row.encoder || 'legacy'),
        status: row.status ? String(row.status) : null,
        remarks: row.remarks ? String(row.remarks) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importFundsLogs(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.id);
    const employeeId = coerceInteger(row.employee_id);
    if (!id || !employeeId) continue;
    await prisma.fundsLog.upsert({
      where: { id },
      update: {},
      create: {
        id,
        atd: row.atd ? String(row.atd) : null,
        employeeId,
        action: String(row.action || 'legacy'),
        type: String(row.type || 'funds'),
        amount: coerceDecimalString(row.amount),
        funds: coerceDecimalString(row.funds),
        encoder: String(row.encoder || 'legacy'),
        cashBy: row.cashby ? String(row.cashby) : null,
        paymentMethod: row.payment_method ? String(row.payment_method) : null,
        status: row.status ? String(row.status) : null,
        remarks: row.remarks ? String(row.remarks) : null,
        createdAt: nonNull(coerceDate(row.created_at), new Date()),
      },
    });
  }
}

async function importReminders(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.reminderid);
    if (!id) continue;
    await prisma.reminder.upsert({
      where: { id },
      update: {},
      create: {
        id,
        title: String(row.title || `Reminder ${id}`),
        description: row.description ? String(row.description) : null,
        frequency: String(row.frequency || 'DAILY'),
        dayOfWeek: row.dayofweek ? String(row.dayofweek) : null,
        timeOfDay: row.timeofday ? String(row.timeofday) : null,
        isActive: row.isactive === 1 || row.isactive === true,
        createdAt: nonNull(coerceDate(row.createdat), new Date()),
        updatedAt: nonNull(coerceDate(row.updatedat), new Date()),
      },
    });
  }
}

async function importReminderTasks(rows: LegacyRow[]) {
  for (const row of rows) {
    const id = coerceInteger(row.taskid);
    const reminderId = coerceInteger(row.reminderid);
    if (!id || !reminderId) continue;
    await prisma.reminderTask.upsert({
      where: { id },
      update: {},
      create: {
        id,
        reminderId,
        name: String(row.taskname || `Task ${id}`),
        sortOrder: coerceInteger(row.sortorder) || 0,
      },
    });
  }
}

async function resetSequence(tableName: string, idColumn = 'id') {
  await prisma.$executeRawUnsafe(
    `select setval(pg_get_serial_sequence('"${tableName}"', '${idColumn}'), coalesce((select max("${idColumn}") from "${tableName}"), 1), true)`,
  );
}

async function resetImportedSequences() {
  const tables = [
    'Store',
    'Employee',
    'UserAccount',
    'EmployeeGroup',
    'EmployeeImage',
    'TimeRecord',
    'WorkSchedule',
    'ScheduleTemplate',
    'EmployeeLeave',
    'EmployeeLeaveBalance',
    'CashAdvance',
    'CashAdvancePayment',
    'Payroll',
    'SelectedPayment',
    'Dispute',
    'Allowance',
    'FundsLog',
    'Reminder',
    'ReminderTask',
  ];

  for (const table of tables) {
    await resetSequence(table);
  }
}

async function main() {
  const options = parseOptions();
  const db = new Database(options.sqlitePath, { readonly: true });
  const actualTables = readTableNames(db);
  const allowedLegacyTables = new Set<string>(LEGACY_TABLES);
  const unknownTables = actualTables.filter(
    (table) => !allowedLegacyTables.has(table) && !SQLITE_SYSTEM_TABLES.has(table),
  );

  if (unknownTables.length > 0) {
    throw new Error(
      `Unmapped legacy table(s) found in sqlite: ${unknownTables.join(
        ', ',
      )}. Update migrate-sqlite-to-postgres.ts before running migration.`,
    );
  }

  if (options.dryRun) {
    for (const table of LEGACY_TABLES) {
      console.log(`${table}: ${readRows(db, table).length}`);
    }
    const existingBusinessTables = actualTables.filter((table) => !SQLITE_SYSTEM_TABLES.has(table));
    console.log(`Detected legacy business tables: ${existingBusinessTables.length}`);
    return;
  }

  await importStores(readRows(db, 'Stores'));
  await importEmployees(readRows(db, 'Employees'));
  await importUsers(readRows(db, 'UserAccounts'));
  await importEmployeeGroups(readRows(db, 'EmployeeGroups'));
  await importEmployeeGroupMembers(readRows(db, 'EmployeeGroupPivot'));
  await importEmployeeImages(readRows(db, 'EmployeeImages'));
  await importTimeRecords(readRows(db, 'TimeRecords'));
  await importWorkSchedules(readRows(db, 'WorkSchedules'));
  await importScheduleTemplates(readRows(db, 'ScheduleTemplates'));
  await importEmployeeWorkSchedules(readRows(db, 'EmployeeWorkSchedule'));
  await importLeaves(readRows(db, 'EmployeeLeaves'));
  await importLeaveBalances(readRows(db, 'EmployeeLeaveBalance'));
  await importCashAdvances(readRows(db, 'CashAdvance'));
  await importCashAdvancePayments(readRows(db, 'CashAdvancePayments'));
  await importPayroll(readRows(db, 'Payroll'));
  await importSelectedPayments(readRows(db, 'SelectedPayments'));
  await importDisputes(readRows(db, 'Disputes'));
  await importAllowances(readRows(db, 'Allowance'));
  await importFundsLogs(readRows(db, 'FundsLog'));
  await importReminders(readRows(db, 'reminders'));
  await importReminderTasks(readRows(db, 'reminder_tasks'));
  await resetImportedSequences();

  console.log('Legacy SQLite migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
