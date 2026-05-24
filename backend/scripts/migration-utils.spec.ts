import {
  coerceDate,
  coerceDecimalString,
  mapLegacyAccountStatus,
  mapLegacyRecurrenceType,
  mapLegacyUserRole,
} from './migration-utils';

describe('migration utils', () => {
  it('converts nullish and invalid money values to a safe decimal string', () => {
    expect(coerceDecimalString(null)).toBe('0');
    expect(coerceDecimalString(undefined)).toBe('0');
    expect(coerceDecimalString('')).toBe('0');
    expect(coerceDecimalString('1,234.50')).toBe('1234.5');
    expect(coerceDecimalString('abc')).toBe('0');
  });

  it('converts legacy date values to Date instances or null', () => {
    expect(coerceDate(null)).toBeNull();
    expect(coerceDate('')).toBeNull();
    expect(coerceDate('2025-01-02T03:04:05.000Z')?.toISOString()).toBe(
      '2025-01-02T03:04:05.000Z',
    );
    expect(coerceDate(1751414400000)?.toISOString()).toBe('2025-07-02T00:00:00.000Z');
    expect(coerceDate('1751414400000')?.toISOString()).toBe('2025-07-02T00:00:00.000Z');
    expect(coerceDate('not-a-date')).toBeNull();
    expect(coerceDate('+027743-12-31T16:00:00.000Z')).toBeNull();
  });

  it('maps legacy account statuses', () => {
    expect(mapLegacyAccountStatus('Y')).toBe('ACTIVE');
    expect(mapLegacyAccountStatus('ACTIVE')).toBe('ACTIVE');
    expect(mapLegacyAccountStatus('N')).toBe('INACTIVE');
    expect(mapLegacyAccountStatus('inactive')).toBe('INACTIVE');
  });

  it('maps legacy role strings', () => {
    expect(mapLegacyUserRole('admin')).toBe('ADMIN');
    expect(mapLegacyUserRole('superadmin')).toBe('SUPER_ADMIN');
    expect(mapLegacyUserRole('employee')).toBe('EMPLOYEE');
    expect(mapLegacyUserRole(null)).toBe('EMPLOYEE');
  });

  it('maps legacy recurrence strings', () => {
    expect(mapLegacyRecurrenceType('daily')).toBe('DAILY');
    expect(mapLegacyRecurrenceType('weekly')).toBe('WEEKLY');
    expect(mapLegacyRecurrenceType('monthly')).toBe('MONTHLY');
    expect(mapLegacyRecurrenceType(null)).toBe('NONE');
  });
});
