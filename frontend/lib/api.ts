import type { ApiRecord, LoginPayload, LoginResponse, SessionUser } from "./types";
import { getManilaDayRange } from "./timezone";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiUrl(path: string, base = API_BASE_URL) {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

export function normalizeApiError(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return "The API request failed.";
}

function shouldSendJson(body: RequestInit["body"]) {
  return body !== undefined && !(body instanceof FormData);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (shouldSendJson(init.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(createApiUrl(path), {
    ...init,
    credentials: "include",
    headers
  });

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw new ApiError(normalizeApiError(data ?? text), response.status, data);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logout() {
  return apiFetch<{ success: boolean }>("auth/logout", {
    method: "POST"
  });
}

export async function getCurrentUser() {
  const result = await apiFetch<{ user: SessionUser }>("auth/me");
  return result.user;
}

export async function listResource<T extends ApiRecord = ApiRecord>(endpoint: string) {
  const result = await apiFetch<T[] | { data: T[] }>(endpoint);
  if (Array.isArray(result)) {
    return result;
  }
  return Array.isArray(result.data) ? result.data : [];
}

export async function createResource<T extends ApiRecord = ApiRecord>(endpoint: string, payload: ApiRecord) {
  return apiFetch<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateResource<T extends ApiRecord = ApiRecord>(
  endpoint: string,
  id: string | number,
  payload: ApiRecord
) {
  return apiFetch<T>(`${endpoint}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deleteResource(endpoint: string, id: string | number) {
  return apiFetch<{ success: boolean }>(`${endpoint}/${id}`, {
    method: "DELETE"
  });
}

export type EmployeeStore = {
  id: number;
  code?: string | null;
  name?: string | null;
  area?: string | null;
};

export type EmployeeProfile = {
  id: number;
  employeeCode?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  status?: string | null;
  position?: string | null;
  salary?: number | string | null;
  phone?: string | null;
  email?: string | null;
  hireDate?: string | null;
  store?: EmployeeStore | null;
};

export type AttendanceRecord = {
  id: number;
  employeeId?: number;
  employee?: EmployeeProfile | null;
  timeIn?: string | null;
  timeOut?: string | null;
  createdAt?: string | null;
  locationIn?: string | null;
  locationOut?: string | null;
  source?: string | null;
  manualReason?: string | null;
};

export type LeaveRecord = {
  id: number;
  employeeId?: number;
  employee?: EmployeeProfile | null;
  leaveType?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: number | null;
  leaveRate?: number | null;
  reason?: string | null;
  approvedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LeaveBalanceSummary = {
  id: number;
  employeeId: number;
  employeeCode?: string | null;
  fullName?: string | null;
  VL: { total: number; used: number; remaining: number };
  SL: { total: number; used: number; remaining: number };
  vacationTotal: number;
  vacationUsed: number;
  sickTotal: number;
  sickUsed: number;
};

export type PayrollRecord = {
  id: number;
  employeeId?: number;
  employee?: EmployeeProfile | null;
  payrollDate?: string | null;
  payrollFrom?: string | null;
  payrollTo?: string | null;
  daysOfWork?: number | null;
  rate?: number | null;
  totalRegularWage?: number | null;
  totalAllowance?: number | null;
  otherDeduction?: number | null;
  netAmountPaid?: number | null;
  totalAmount?: number | null;
  overtimeHours?: number | null;
  lateHours?: number | null;
  status?: string | null;
};

export type CashAdvanceRecord = {
  id: number;
  employeeId?: number;
  employee?: EmployeeProfile | null;
  atd?: string | null;
  type?: string | null;
  amount?: number | null;
  interests?: number | null;
  totalAmount?: number | null;
  totalPaid?: number | null;
  balance?: number | null;
  paymentMethod?: string | null;
  status?: string | null;
  dateIssued?: string | null;
  repaymentDue?: string | null;
  installmentPlan?: number | null;
  reason?: string | null;
};

export type CreateLeaveRequestPayload = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  leaveRate?: number;
};

function appendDateRange(path: string, filters?: { from?: string; to?: string }) {
  if (!filters?.from && !filters?.to) {
    return path;
  }
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const delimiter = path.includes("?") ? "&" : "?";
  return `${path}${delimiter}${params.toString()}`;
}

export async function getEmployeeProfile() {
  return apiFetch<EmployeeProfile | null>("employees/me");
}

export async function getMyAttendance(filters?: { from?: string; to?: string }) {
  return apiFetch<AttendanceRecord[]>(appendDateRange("attendance/me", filters));
}

export async function getMyLeaves() {
  return apiFetch<LeaveRecord[]>("leaves/me");
}

export async function createMyLeaveRequest(payload: CreateLeaveRequestPayload) {
  return apiFetch<LeaveRecord>("leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyLeaveBalance() {
  return apiFetch<LeaveBalanceSummary>("leave-balances/me");
}

export async function getMyPayroll(filters?: { from?: string; to?: string }) {
  return apiFetch<PayrollRecord[]>(appendDateRange("payroll/me", filters));
}

export async function getMyCashAdvances() {
  return apiFetch<CashAdvanceRecord[]>("cash-advances/me");
}

export async function getMyUnpaidCashAdvances(type?: string) {
  const endpoint = type ? `cash-advances/me/unpaid?type=${encodeURIComponent(type)}` : "cash-advances/me/unpaid";
  return apiFetch<CashAdvanceRecord[]>(endpoint);
}

export type DashboardSnapshot = {
  employees: number;
  activeEmployees: number;
  attendanceToday: number;
  pendingLeaves: number;
  payrollDrafts: number;
  pendingAdvances: number;
  recentExceptions: ApiRecord[];
  attendanceRows: ApiRecord[];
  leaveRows: ApiRecord[];
  payrollRows: ApiRecord[];
  cashAdvanceRows: ApiRecord[];
};

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [employees, attendance, leaves, payroll, cashAdvances] = await Promise.allSettled([
    listResource("employees"),
    listResource("attendance"),
    listResource("leaves"),
    listResource("payroll"),
    listResource("cash-advances")
  ]);

  const unwrap = (result: PromiseSettledResult<ApiRecord[]>) =>
    result.status === "fulfilled" ? result.value : [];

  const employeeRows = unwrap(employees);
  const attendanceRows = unwrap(attendance);
  const leaveRows = unwrap(leaves);
  const payrollRows = unwrap(payroll);
  const cashAdvanceRows = unwrap(cashAdvances);
  const { start: dayStart, end: dayEnd } = getManilaDayRange();

  const attendanceToday = attendanceRows.filter((row) => {
    const value = row.timeIn ?? row.createdAt;
    if (typeof value !== "string") return false;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed >= dayStart && parsed < dayEnd;
  }).length;

  return {
    employees: employeeRows.length,
    activeEmployees: employeeRows.filter((row) => row.status === "ACTIVE").length,
    attendanceToday,
    pendingLeaves: leaveRows.filter((row) => row.status === "PENDING").length,
    payrollDrafts: payrollRows.filter((row) => row.status === "DRAFT" || row.status === "PREVIEWED").length,
    pendingAdvances: cashAdvanceRows.filter((row) => row.status === "PENDING" || row.paymentStatus === "PENDING").length,
    recentExceptions: attendanceRows
      .filter((row) => row.timeIn && !row.timeOut)
      .slice(0, 10),
    attendanceRows,
    leaveRows,
    payrollRows,
    cashAdvanceRows
  };
}
