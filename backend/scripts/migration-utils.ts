import {
  AccountStatus,
  EmployeeStatus,
  LeaveStatus,
  PaymentStatus,
  PayrollStatus,
  RecurrenceType,
  UserRole,
} from '@prisma/client';

export function coerceDecimalString(value: unknown): string {
  if (value === null || value === undefined || value === '') return '0';
  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return '0';
  return String(parsed);
}

export function coerceInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function coerceDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    const text = String(value).trim();
    date = /^\d{11,}$/.test(text) ? new Date(Number(text)) : new Date(text);
  }
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) return null;
  return date;
}

export function mapLegacyAccountStatus(value: unknown): AccountStatus {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'N' || normalized === 'INACTIVE'
    ? AccountStatus.INACTIVE
    : AccountStatus.ACTIVE;
}

export function mapLegacyEmployeeStatus(value: unknown): EmployeeStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'AWOL') return EmployeeStatus.AWOL;
  if (normalized === 'BLACKLISTED') return EmployeeStatus.BLACKLISTED;
  if (normalized === 'FLOATING') return EmployeeStatus.FLOATING;
  if (normalized === 'LEAVE') return EmployeeStatus.LEAVE;
  if (normalized === 'NOSCHEDULE' || normalized === 'NO SCHEDULE') return EmployeeStatus.NOSCHEDULE;
  if (normalized === 'RESIGNED') return EmployeeStatus.RESIGNED;
  if (normalized === 'TERMINATE' || normalized === 'TERMINATED') return EmployeeStatus.TERMINATE;
  if (normalized === 'INACTIVE') return EmployeeStatus.INACTIVE;
  if (normalized === 'ENDED') return EmployeeStatus.ENDED;
  return EmployeeStatus.ACTIVE;
}

export function mapLegacyUserRole(value: unknown): UserRole {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'admin') return UserRole.ADMIN;
  if (normalized === 'superadmin' || normalized === 'super_admin') return UserRole.SUPER_ADMIN;
  return UserRole.EMPLOYEE;
}

export function mapLegacyLeaveStatus(value: unknown): LeaveStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'APPROVED') return LeaveStatus.APPROVED;
  if (normalized === 'REJECTED') return LeaveStatus.REJECTED;
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return LeaveStatus.CANCELLED;
  return LeaveStatus.PENDING;
}

export function mapLegacyPayrollStatus(value: unknown): PayrollStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'RELEASED' || normalized === 'PAID') return PayrollStatus.RELEASED;
  if (normalized === 'VOIDED' || normalized === 'CANCELLED') return PayrollStatus.VOIDED;
  if (normalized === 'PREVIEWED') return PayrollStatus.PREVIEWED;
  return PayrollStatus.DRAFT;
}

export function mapLegacyPaymentStatus(value: unknown): PaymentStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'UNPAID' || normalized === 'APPROVED') return PaymentStatus.APPROVED;
  if (normalized === 'FOR_APPROVAL' || normalized === 'PENDING') return PaymentStatus.PENDING;
  if (normalized === 'PAID' || normalized === 'RELEASED') return PaymentStatus.PAID;
  if (normalized === 'PARTIAL') return PaymentStatus.PARTIAL;
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return PaymentStatus.CANCELLED;
  return PaymentStatus.PENDING;
}

export function mapLegacyRecurrenceType(value: unknown): RecurrenceType {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'DAILY') return RecurrenceType.DAILY;
  if (normalized === 'WEEKLY') return RecurrenceType.WEEKLY;
  if (normalized === 'MONTHLY') return RecurrenceType.MONTHLY;
  return RecurrenceType.NONE;
}

export function stripApiPrefix(path: unknown): string | null {
  if (!path) return null;
  return String(path).replace(/^\/api/, '');
}
