-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'RELEASED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('REMOTE_CLOCK', 'ADMIN_MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "UserAccount" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "employeeCode" TEXT,
    "storeId" INTEGER,
    "storeCode" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "legacyPassword" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "menuRole" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "area" TEXT,
    "contactNumber" TEXT,
    "contactPerson" TEXT,
    "contactPersonNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3),
    "age" INTEGER,
    "gender" TEXT,
    "religion" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "sssId" TEXT,
    "sssContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "philhealthId" TEXT,
    "philhealthContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagibigId" TEXT,
    "pagibigContribution" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hireDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "position" TEXT,
    "salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "funds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "emergencyContactName" TEXT,
    "emergencyContactNumber" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hasAssets" BOOLEAN NOT NULL DEFAULT false,
    "assetRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EmployeeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGroupMember" (
    "employeeId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "role" TEXT,

    CONSTRAINT "EmployeeGroupMember_pkey" PRIMARY KEY ("employeeId","groupId")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "daysOfWork" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRegularWage" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lateHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtimeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lateAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "addOnHoliday" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sssDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "philhealthDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagibigDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valeDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loanDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyOrUndertime" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pondo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sssLoan" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pagibigLoan" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "philhealthLoan" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "endingFund" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payrollDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payrollFrom" TIMESTAMP(3),
    "payrollTo" TIMESTAMP(3),
    "penaltyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltyRemarks" TEXT,
    "bonusRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonusRemarks" TEXT,
    "otherDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payMethod" TEXT,
    "createdBy" TEXT,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectedPayment" (
    "id" SERIAL NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashAdvanceId" INTEGER,
    "installmentPlan" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SelectedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" SERIAL NOT NULL,
    "payrollId" INTEGER NOT NULL,
    "timeRecordId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "scheduleDate" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "locationIn" TEXT,
    "locationOut" TEXT,
    "timeInImage" TEXT,
    "timeOutImage" TEXT,
    "encoder" TEXT,
    "source" "AttendanceSource" NOT NULL DEFAULT 'REMOTE_CLOCK',
    "manualReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" SERIAL NOT NULL,
    "shiftName" TEXT NOT NULL,
    "workDay" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "duration" DECIMAL(10,2),
    "breakDuration" DECIMAL(10,2),
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE',
    "recurrenceEnd" TIMESTAMP(3),
    "recurrenceDays" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workDay" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "duration" DECIMAL(10,2),
    "breakDuration" DECIMAL(10,2),
    "legacyEmployeeIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeWorkSchedule" (
    "employeeId" INTEGER NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "templateId" INTEGER,

    CONSTRAINT "EmployeeWorkSchedule_pkey" PRIMARY KEY ("employeeId","scheduleId")
);

-- CreateTable
CREATE TABLE "EmployeeImage" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "validId1" TEXT,
    "validId2" TEXT,
    "mugshot1" TEXT,
    "mugshot2" TEXT,
    "mugshot3" TEXT,
    "mugshot4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAdvance" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT,
    "atd" TEXT,
    "employeeId" INTEGER NOT NULL,
    "employeeCode" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "paymentMethod" TEXT,
    "encoder" TEXT,
    "type" TEXT,
    "dateIssued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repaymentDue" TIMESTAMP(3),
    "installmentPlan" INTEGER NOT NULL DEFAULT 1,
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "interests" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAdvancePayment" (
    "id" SERIAL NOT NULL,
    "cashAdvanceId" INTEGER NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT,
    "type" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashAdvancePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLeave" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "leaveRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLeaveBalance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "leaveType" TEXT NOT NULL,
    "totalLeaves" INTEGER NOT NULL DEFAULT 0,
    "usedLeaves" INTEGER NOT NULL DEFAULT 0,
    "remainingLeaves" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allowance" (
    "id" SERIAL NOT NULL,
    "atd" TEXT,
    "employeeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "encoder" TEXT NOT NULL,
    "status" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundsLog" (
    "id" SERIAL NOT NULL,
    "atd" TEXT,
    "employeeId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "funds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "encoder" TEXT NOT NULL,
    "cashBy" TEXT,
    "paymentMethod" TEXT,
    "status" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "dayOfWeek" TEXT,
    "timeOfDay" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderTask" (
    "id" SERIAL NOT NULL,
    "reminderId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReminderTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" SERIAL NOT NULL,
    "module" TEXT NOT NULL,
    "ownerType" TEXT,
    "ownerId" INTEGER,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAccount_username_key" ON "UserAccount"("username");

-- CreateIndex
CREATE INDEX "UserAccount_employeeId_idx" ON "UserAccount"("employeeId");

-- CreateIndex
CREATE INDEX "UserAccount_storeId_idx" ON "UserAccount"("storeId");

-- CreateIndex
CREATE INDEX "UserAccount_role_idx" ON "UserAccount"("role");

-- CreateIndex
CREATE INDEX "UserAccount_status_idx" ON "UserAccount"("status");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE INDEX "Store_name_idx" ON "Store"("name");

-- CreateIndex
CREATE INDEX "Employee_storeId_idx" ON "Employee"("storeId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeGroup_name_key" ON "EmployeeGroup"("name");

-- CreateIndex
CREATE INDEX "Payroll_employeeId_idx" ON "Payroll"("employeeId");

-- CreateIndex
CREATE INDEX "Payroll_payrollFrom_payrollTo_idx" ON "Payroll"("payrollFrom", "payrollTo");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "SelectedPayment_payrollId_idx" ON "SelectedPayment"("payrollId");

-- CreateIndex
CREATE INDEX "Dispute_payrollId_idx" ON "Dispute"("payrollId");

-- CreateIndex
CREATE INDEX "Dispute_employeeId_idx" ON "Dispute"("employeeId");

-- CreateIndex
CREATE INDEX "TimeRecord_employeeId_idx" ON "TimeRecord"("employeeId");

-- CreateIndex
CREATE INDEX "TimeRecord_timeIn_idx" ON "TimeRecord"("timeIn");

-- CreateIndex
CREATE INDEX "TimeRecord_timeOut_idx" ON "TimeRecord"("timeOut");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeImage_employeeId_key" ON "EmployeeImage"("employeeId");

-- CreateIndex
CREATE INDEX "CashAdvance_employeeId_idx" ON "CashAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "CashAdvance_status_idx" ON "CashAdvance"("status");

-- CreateIndex
CREATE INDEX "CashAdvancePayment_cashAdvanceId_idx" ON "CashAdvancePayment"("cashAdvanceId");

-- CreateIndex
CREATE INDEX "EmployeeLeave_employeeId_idx" ON "EmployeeLeave"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeLeave_status_idx" ON "EmployeeLeave"("status");

-- CreateIndex
CREATE INDEX "EmployeeLeave_startDate_endDate_idx" ON "EmployeeLeave"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLeaveBalance_employeeId_leaveType_key" ON "EmployeeLeaveBalance"("employeeId", "leaveType");

-- CreateIndex
CREATE INDEX "Allowance_employeeId_idx" ON "Allowance"("employeeId");

-- CreateIndex
CREATE INDEX "FundsLog_employeeId_idx" ON "FundsLog"("employeeId");

-- CreateIndex
CREATE INDEX "StoredFile_module_idx" ON "StoredFile"("module");

-- CreateIndex
CREATE INDEX "StoredFile_ownerType_ownerId_idx" ON "StoredFile"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccount" ADD CONSTRAINT "UserAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGroupMember" ADD CONSTRAINT "EmployeeGroupMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGroupMember" ADD CONSTRAINT "EmployeeGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EmployeeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedPayment" ADD CONSTRAINT "SelectedPayment_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeWorkSchedule" ADD CONSTRAINT "EmployeeWorkSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeWorkSchedule" ADD CONSTRAINT "EmployeeWorkSchedule_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeWorkSchedule" ADD CONSTRAINT "EmployeeWorkSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeImage" ADD CONSTRAINT "EmployeeImage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAdvance" ADD CONSTRAINT "CashAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAdvancePayment" ADD CONSTRAINT "CashAdvancePayment_cashAdvanceId_fkey" FOREIGN KEY ("cashAdvanceId") REFERENCES "CashAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeave" ADD CONSTRAINT "EmployeeLeave_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLeaveBalance" ADD CONSTRAINT "EmployeeLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allowance" ADD CONSTRAINT "Allowance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundsLog" ADD CONSTRAINT "FundsLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderTask" ADD CONSTRAINT "ReminderTask_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

