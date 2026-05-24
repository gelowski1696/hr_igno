"use client";

import { useQuery } from "@tanstack/react-query";
import { Columns3, Download, Filter } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { API_BASE_URL, apiFetch, listResource } from "@/lib/api";
import { formatCell } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportTable } from "@/components/reports/report-table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type SummaryRow = {
  id: number;
  date: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  employeeStatus?: string | null;
  store?: string | null;
  scheduleStart?: string | null;
  scheduleEnd?: string | null;
  timeIn?: string | null;
  timeOut?: string | null;
  lateMinutes: number;
  workedHours: number;
  status: string;
  locationIn?: string | null;
  locationOut?: string | null;
  source?: string | null;
  timeInImage?: string | null;
  timeOutImage?: string | null;
};

type SummaryResponse = {
  kpis: {
    expectedEmployees: number;
    presentEmployees: number;
    lateEmployees: number;
    noTimeOutRecords: number;
    absentEmployees: number;
    totalRecords: number;
  };
  trend: Array<{
    date: string;
    present: number;
    late: number;
    noTimeOut: number;
    absent: number;
  }>;
  rows: SummaryRow[];
};

type FilterState = {
  from: string;
  to: string;
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
};

type ColumnDefinition = {
  key: string;
  label: string;
  render: (row: SummaryRow) => ReactNode;
};

const summaryColumns: ColumnDefinition[] = [
  {
    key: "date",
    label: "Date",
    render: (row) => formatCell(row.date, "date"),
  },
  {
    key: "employeeCode",
    label: "ID",
    render: (row) => row.employeeCode || "-",
  },
  {
    key: "employeeName",
    label: "Employee",
    render: (row) => row.employeeName || "-",
  },
  {
    key: "store",
    label: "Store",
    render: (row) => row.store || "-",
  },
  {
    key: "schedule",
    label: "Schedule",
    render: (row) =>
      row.scheduleStart && row.scheduleEnd
        ? `${formatCell(row.scheduleStart, "time")} - ${formatCell(row.scheduleEnd, "time")}`
        : "-",
  },
  {
    key: "timeIn",
    label: "Time In",
    render: (row) => formatCell(row.timeIn, "datetime"),
  },
  {
    key: "timeOut",
    label: "Time Out",
    render: (row) => formatCell(row.timeOut, "datetime"),
  },
  {
    key: "lateMinutes",
    label: "Late (min)",
    render: (row) => String(row.lateMinutes || 0),
  },
  {
    key: "workedHours",
    label: "Worked Hours",
    render: (row) => String(row.workedHours || 0),
  },
  {
    key: "status",
    label: "Status",
    render: (row) => <StatusBadge value={row.status} />,
  },
  {
    key: "locationIn",
    label: "Location In",
    render: (row) => row.locationIn || "-",
  },
  {
    key: "locationOut",
    label: "Location Out",
    render: (row) => row.locationOut || "-",
  },
  {
    key: "timeInImage",
    label: "Time In Image",
    render: (row) => renderImageLink(row.timeInImage),
  },
  {
    key: "timeOutImage",
    label: "Time Out Image",
    render: (row) => renderImageLink(row.timeOutImage),
  },
];

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "All Statuses", value: "ALL" },
  { label: "AWOL", value: "AWOL" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Resigned", value: "RESIGNED" },
  { label: "Ended", value: "ENDED" },
];

export function AttendanceSummaryReport() {
  const defaults = useMemo(() => defaultManilaMonthRange(), []);
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    from: defaults.from,
    to: defaults.to,
    storeId: "",
    groupId: "",
    employeeId: "",
    status: "ACTIVE",
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(draftFilters);
  const [search, setSearch] = useState("");
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    summaryColumns.reduce<Record<string, boolean>>((state, column) => {
      state[column.key] = true;
      return state;
    }, {}),
  );

  const storesQuery = useQuery({
    queryKey: ["reports", "stores"],
    queryFn: () => listResource("stores"),
  });
  const groupsQuery = useQuery({
    queryKey: ["reports", "groups"],
    queryFn: () => listResource("employee-groups"),
  });
  const employeesQuery = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: () => listResource("employees"),
  });

  const summaryQuery = useQuery({
    queryKey: ["reports", "attendance-summary", appliedFilters],
    queryFn: () => apiFetch<SummaryResponse>(`reports/attendance-summary${buildQueryString(appliedFilters)}`),
  });

  const rows = summaryQuery.data?.rows || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.date, row.employeeCode, row.employeeName, row.store, row.status, row.locationIn, row.locationOut]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [rows, search]);

  const trend = summaryQuery.data?.trend || [];
  const trendMax = Math.max(
    1,
    ...trend.map((item) => item.present + item.late + item.noTimeOut + item.absent),
  );
  const activeFilters = summarizeActiveFilters(appliedFilters, storesQuery.data || [], groupsQuery.data || [], employeesQuery.data || []);
  const selectedColumns = summaryColumns.filter((column) => visibleColumns[column.key]);

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Attendance Summary</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Understand present, late, absent estimate, and no-time-out records with PH-date filtering.
        </p>
      </header>

      <section className="border-[1.5px] border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">From</span>
            <Input type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((prev) => ({ ...prev, from: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">To</span>
            <Input type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((prev) => ({ ...prev, to: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Store</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.storeId}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, storeId: event.target.value }))}
            >
              <option value="">All stores</option>
              {(storesQuery.data || []).map((store) => (
                <option key={String(store.id)} value={String(store.id)}>
                  {String(store.area || store.name || store.code || `Store ${store.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Group</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.groupId}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, groupId: event.target.value }))}
            >
              <option value="">All groups</option>
              {(groupsQuery.data || []).map((group) => (
                <option key={String(group.id)} value={String(group.id)}>
                  {String(group.name || `Group ${group.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Employee</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.employeeId}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, employeeId: event.target.value }))}
            >
              <option value="">All employees</option>
              {(employeesQuery.data || []).map((employee) => (
                <option key={String(employee.id)} value={String(employee.id)}>
                  {formatEmployeeOptionLabel(employee)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Status</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button icon={<Filter className="h-4 w-4" />} onClick={() => setAppliedFilters(draftFilters)}>
            Apply filters
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const next = { ...defaultManilaMonthRange(), storeId: "", groupId: "", employeeId: "", status: "ACTIVE" };
              setDraftFilters(next);
              setAppliedFilters(next);
            }}
          >
            Reset
          </Button>
        </div>

        {activeFilters.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((chip) => (
              <span key={chip} className="inline-flex items-center border border-line bg-muted px-2 py-1 text-xs font-semibold text-slate-600">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {summaryQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : summaryQuery.isError ? (
        <section className="border-l-[4px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
          {(summaryQuery.error as Error).message || "Unable to load attendance summary."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Expected" value={summaryQuery.data?.kpis.expectedEmployees || 0} hint="Scoped employee count" />
            <KpiCard label="Present" value={summaryQuery.data?.kpis.presentEmployees || 0} hint="With clock-in records" />
            <KpiCard label="Late" value={summaryQuery.data?.kpis.lateEmployees || 0} hint="Late versus schedule start" />
            <KpiCard label="No Time Out" value={summaryQuery.data?.kpis.noTimeOutRecords || 0} hint="Clock-in without clock-out" />
            <KpiCard label="Absent Est." value={summaryQuery.data?.kpis.absentEmployees || 0} hint="Expected minus present" />
            <KpiCard label="Total Records" value={summaryQuery.data?.kpis.totalRecords || 0} hint="Attendance rows in range" />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="border-b-[1.5px] border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Daily Trend</h3>
              <p className="text-xs text-slate-500">Present, late, no-time-out, and absent estimate per day.</p>
            </div>
            <div className="overflow-x-auto px-3 py-3">
              <div className="min-w-[720px] space-y-2">
                {trend.map((item) => {
                  const total = item.present + item.late + item.noTimeOut + item.absent;
                  const width = total > 0 ? (total / trendMax) * 100 : 0;
                  return (
                    <div key={item.date} className="grid grid-cols-[110px_minmax(0,1fr)_170px] items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-600">{formatCell(item.date, "date")}</span>
                      <div className="h-3 overflow-hidden bg-slate-100">
                        <div className="flex h-full" style={{ width: `${width}%` }}>
                          <span className="h-full bg-emerald-500" style={{ width: `${(item.present / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-amber-500" style={{ width: `${(item.late / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-rose-500" style={{ width: `${(item.noTimeOut / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-slate-400" style={{ width: `${(item.absent / Math.max(total, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-right text-slate-600">
                        P:{item.present} L:{item.late} NTO:{item.noTimeOut} A:{item.absent}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employee, status, location, store"
                  className="h-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => exportSummaryCsv(filteredRows)}
                >
                  Export CSV
                </Button>
                <div className="relative">
                  <Button variant="secondary" icon={<Columns3 className="h-4 w-4" />} onClick={() => setColumnMenuOpen((open) => !open)}>
                    Columns
                  </Button>
                  {columnMenuOpen ? (
                    <div className="absolute right-0 top-10 z-20 w-56 border border-line bg-white p-3 shadow-lg">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Visible columns</p>
                      <div className="space-y-1.5">
                        {summaryColumns.map((column) => (
                          <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-600"
                              checked={visibleColumns[column.key]}
                              onChange={() =>
                                setVisibleColumns((prev) => ({
                                  ...prev,
                                  [column.key]: !prev[column.key],
                                }))
                              }
                            />
                            <span>{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <ReportTable
              rows={filteredRows}
              columns={selectedColumns}
              rowKey={(row) => row.id}
              minWidthClassName="min-w-[1240px]"
              emptyLabel="No records match the current search/filter."
            />
          </section>
        </>
      )}
    </section>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="border-[1.5px] border-line bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 font-slab text-3xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function renderImageLink(value?: string | null) {
  const resolved = resolveImageCellSrc(value);
  if (!resolved) {
    return <span className="text-slate-400">-</span>;
  }
  return (
    <a href={resolved} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
      View
    </a>
  );
}

function buildQueryString(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.storeId) params.set("storeId", filters.storeId);
  if (filters.groupId) params.set("groupId", filters.groupId);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function defaultManilaMonthRange(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

function formatEmployeeOptionLabel(employee: Record<string, unknown>) {
  const code = String(employee.employeeCode || "").trim();
  const firstName = String(employee.firstName || "").trim();
  const lastName = String(employee.lastName || "").trim();
  const store = (employee.store && typeof employee.store === "object" ? (employee.store as Record<string, unknown>) : undefined) || {};
  const area = String(store.area || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const base = code && fullName ? `${code} - ${fullName}` : code || fullName || `Employee ${employee.id}`;
  return area ? `${base} (${area})` : base;
}

function summarizeActiveFilters(
  filters: FilterState,
  stores: Array<Record<string, unknown>>,
  groups: Array<Record<string, unknown>>,
  employees: Array<Record<string, unknown>>,
) {
  const chips: string[] = [];
  chips.push(`From: ${filters.from}`);
  chips.push(`To: ${filters.to}`);

  if (filters.storeId) {
    const store = stores.find((item) => String(item.id) === filters.storeId);
    chips.push(`Store: ${String(store?.area || store?.name || filters.storeId)}`);
  }
  if (filters.groupId) {
    const group = groups.find((item) => String(item.id) === filters.groupId);
    chips.push(`Group: ${String(group?.name || filters.groupId)}`);
  }
  if (filters.employeeId) {
    const employee = employees.find((item) => String(item.id) === filters.employeeId);
    chips.push(`Employee: ${employee ? formatEmployeeOptionLabel(employee) : filters.employeeId}`);
  }
  if (filters.status && filters.status !== "ALL") {
    chips.push(`Status: ${filters.status}`);
  }

  return chips;
}

function exportSummaryCsv(rows: SummaryRow[]) {
  const headers = [
    "Date",
    "Employee ID",
    "Employee Name",
    "Store",
    "Schedule Start",
    "Schedule End",
    "Time In",
    "Time Out",
    "Late Minutes",
    "Worked Hours",
    "Status",
    "Location In",
    "Location Out",
    "Source",
  ];

  const lines = rows.map((row) =>
    [
      row.date,
      row.employeeCode,
      row.employeeName,
      row.store || "",
      row.scheduleStart || "",
      row.scheduleEnd || "",
      row.timeIn || "",
      row.timeOut || "",
      row.lateMinutes,
      row.workedHours,
      row.status,
      row.locationIn || "",
      row.locationOut || "",
      row.source || "",
    ]
      .map((cell) => csvEscape(cell))
      .join(","),
  );

  const csvContent = [headers.join(","), ...lines].join("\n");
  downloadTextFile(`attendance-summary-${Date.now()}.csv`, csvContent, "text/csv;charset=utf-8;");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const absoluteUrlPattern = /^https?:\/\//i;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const apiOrigin = resolveApiOrigin(API_BASE_URL);

function resolveApiOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function resolveImageCellSrc(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("data:image/")) return raw;
  if (absoluteUrlPattern.test(raw)) return raw;
  if (raw.startsWith("/")) return apiOrigin ? `${apiOrigin}${raw}` : raw;
  if (raw.startsWith("uploads/")) return apiOrigin ? `${apiOrigin}/${raw}` : `/${raw}`;
  if (looksLikeBase64Image(raw)) {
    const mime = raw.startsWith("iVBORw0KGgo") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${raw}`;
  }
  return raw;
}

function looksLikeBase64Image(value: string) {
  if (value.length < 64) return false;
  if (value.includes("/") || value.includes("\\")) return false;
  return base64Pattern.test(value);
}
