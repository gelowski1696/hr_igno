export type UserRole = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

export type SessionUser = {
  id: number;
  username: string;
  role: UserRole;
  employeeId: number | null;
  storeId: number | null;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type LoginResponse = {
  user: SessionUser;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
};

export type ApiRecord = Record<string, unknown>;

export type ResourceColumn = {
  key: string;
  header: string;
  type?: "text" | "raw" | "date" | "time" | "datetime" | "currency" | "number" | "status" | "person" | "image";
  hideOnMobile?: boolean;
};

export type ResourceField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "time" | "datetime-local" | "select" | "textarea" | "password";
  required?: boolean;
  readOnly?: boolean;
  coerceNumber?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

export type ResourceConfig = {
  title: string;
  eyebrow: string;
  description: string;
  endpoint?: string;
  formVariant?: "default" | "leave-request" | "leave-balance" | "user-account" | "cash-advance" | "payroll-run";
  dateRangeFilter?: {
    enabled?: boolean;
    fromParam?: string;
    toParam?: string;
    defaultToTodayInManila?: boolean;
  };
  columns: ResourceColumn[];
  searchPlaceholder?: string;
  createLabel?: string;
  formFields?: ResourceField[];
  formPanelClassName?: string;
  emptyLabel?: string;
};
