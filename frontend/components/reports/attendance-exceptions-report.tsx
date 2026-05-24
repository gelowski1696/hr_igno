"use client";

import { useQuery } from "@tanstack/react-query";
import { Columns3, Download, Filter } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { apiFetch, listResource } from "@/lib/api";
import { formatCell } from "@/lib/formatters";
import { ReportTable } from "@/components/reports/report-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type ExceptionRow = {
  id: string;
  type: "NO_TIMEOUT" | "NO_TIMEIN" | "DUPLICATE" | "MISSING_LOCATION" | "MISSING_IMAGE";
  label: string;
  date: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store?: string | null;
  source: string;
  timeIn?: string | null;
  timeOut?: string | null;
  location?: string | null;
  notes?: string | null;
  hasTimeInImage: boolean;
  hasTimeOutImage: boolean;
};

type ExceptionsResponse = {
  kpis: {
    total: number;
    noTimeOut: number;
    noTimeIn: number;
    duplicate: number;
    missingLocation: number;
    missingImage: number;
  };
  rows: ExceptionRow[];
};

type FilterState = {
  from: string;
  to: string;
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
  type: string;
};

type ColumnDefinition = {
  key: string;
  label: string;
  render: (row: ExceptionRow) => ReactNode;
};

const exceptionColumns: ColumnDefinition[] = [
  { key: "type", label: "Exception", render: (row) => <StatusBadge value={row.type} /> },
  { key: "date", label: "Date", render: (row) => formatCell(row.date, "date") },
  { key: "employeeCode", label: "ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "timeIn", label: "Time In", render: (row) => formatCell(row.timeIn, "datetime") },
  { key: "timeOut", label: "Time Out", render: (row) => formatCell(row.timeOut, "datetime") },
  { key: "source", label: "Source", render: (row) => <StatusBadge value={row.source} /> },
  { key: "location", label: "Location", render: (row) => row.location || "-" },
  { key: "notes", label: "Notes", render: (row) => row.notes || "-" },
  { key: "images", label: "Images", render: (row) => `${row.hasTimeInImage ? "IN" : "-"} / ${row.hasTimeOutImage ? "OUT" : "-"}` },
];

const exceptionTypes = [
  { label: "All types", value: "" },
  { label: "No Time Out", value: "NO_TIMEOUT" },
  { label: "No Time In", value: "NO_TIMEIN" },
  { label: "Duplicate", value: "DUPLICATE" },
  { label: "Missing Location", value: "MISSING_LOCATION" },
  { label: "Missing Image", value: "MISSING_IMAGE" },
];

export function AttendanceExceptionsReport() {
  const defaults = useMemo(() => defaultManilaMonthRange(), []);
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    from: defaults.from,
    to: defaults.to,
    storeId: "",
    groupId: "",
    employeeId: "",
    status: "ACTIVE",
    type: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(draftFilters);
  const [search, setSearch] = useState("");
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    exceptionColumns.reduce<Record<string, boolean>>((state, column) => {
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

  const exceptionsQuery = useQuery({
    queryKey: ["reports", "attendance-exceptions", appliedFilters],
    queryFn: () => apiFetch<ExceptionsResponse>(`reports/attendance-exceptions${buildQueryString(appliedFilters)}`),
  });

  const rows = exceptionsQuery.data?.rows || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.type, row.date, row.employeeCode, row.employeeName, row.store, row.location, row.notes, row.source]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [rows, search]);

  const selectedColumns = exceptionColumns.filter((column) => visibleColumns[column.key]);

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Attendance Exceptions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Quickly identify records needing manual review such as no-time-out, duplicates, and missing details.
        </p>
      </header>

      <section className="border-[1.5px] border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
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
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Employee Status</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.status}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ACTIVE">Active</option>
              <option value="ALL">All Statuses</option>
              <option value="AWOL">AWOL</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RESIGNED">Resigned</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Exception Type</span>
            <select
              className="h-9 w-full border border-line bg-white px-3 text-sm text-ink"
              value={draftFilters.type}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, type: event.target.value }))}
            >
              {exceptionTypes.map((type) => (
                <option key={type.value || "all"} value={type.value}>
                  {type.label}
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
              const next = { ...defaultManilaMonthRange(), storeId: "", groupId: "", employeeId: "", status: "ACTIVE", type: "" };
              setDraftFilters(next);
              setAppliedFilters(next);
            }}
          >
            Reset
          </Button>
        </div>
      </section>

      {exceptionsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : exceptionsQuery.isError ? (
        <section className="border-l-[4px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
          {(exceptionsQuery.error as Error).message || "Unable to load attendance exceptions."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total" value={exceptionsQuery.data?.kpis.total || 0} />
            <KpiCard label="No Time Out" value={exceptionsQuery.data?.kpis.noTimeOut || 0} />
            <KpiCard label="No Time In" value={exceptionsQuery.data?.kpis.noTimeIn || 0} />
            <KpiCard label="Duplicate" value={exceptionsQuery.data?.kpis.duplicate || 0} />
            <KpiCard label="Missing Location" value={exceptionsQuery.data?.kpis.missingLocation || 0} />
            <KpiCard label="Missing Image" value={exceptionsQuery.data?.kpis.missingImage || 0} />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search exception, employee, notes, source"
                  className="h-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => exportExceptionsCsv(filteredRows)}>
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
                        {exceptionColumns.map((column) => (
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
              minWidthClassName="min-w-[1120px]"
              emptyLabel="No exception rows match the current search/filter."
            />
          </section>
        </>
      )}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-[1.5px] border-line bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 font-slab text-3xl font-bold leading-none text-ink">{value}</p>
    </div>
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
  if (filters.type) params.set("type", filters.type);
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

function exportExceptionsCsv(rows: ExceptionRow[]) {
  const headers = [
    "Exception",
    "Date",
    "Employee ID",
    "Employee Name",
    "Store",
    "Time In",
    "Time Out",
    "Source",
    "Location",
    "Notes",
    "Has Time In Image",
    "Has Time Out Image",
  ];

  const lines = rows.map((row) =>
    [
      row.type,
      row.date,
      row.employeeCode,
      row.employeeName,
      row.store || "",
      row.timeIn || "",
      row.timeOut || "",
      row.source,
      row.location || "",
      row.notes || "",
      row.hasTimeInImage ? "YES" : "NO",
      row.hasTimeOutImage ? "YES" : "NO",
    ]
      .map((cell) => csvEscape(cell))
      .join(","),
  );

  const csvContent = [headers.join(","), ...lines].join("\n");
  downloadTextFile(`attendance-exceptions-${Date.now()}.csv`, csvContent, "text/csv;charset=utf-8;");
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
