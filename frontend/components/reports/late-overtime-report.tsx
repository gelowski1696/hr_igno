"use client";

import { useQuery } from "@tanstack/react-query";
import { Columns3, Download, Filter } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { apiFetch, listResource } from "@/lib/api";
import { formatCell, formatMoney } from "@/lib/formatters";
import { ReportTable } from "@/components/reports/report-table";
import { buildQueryString, csvEscape, defaultManilaMonthRange, downloadTextFile, formatEmployeeOptionLabel, formatStoreOptionLabel } from "@/components/reports/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type FilterState = {
  from: string;
  to: string;
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
};

type Row = {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store: string;
  totalDaysWorked: number;
  lateHours: number;
  overtimeHours: number;
  lateDeduction: number;
  overtimePay: number;
  netImpact: number;
};

type Response = {
  kpis: {
    totalLateHours: number;
    totalOvertimeHours: number;
    lateDeductionEstimate: number;
    overtimePayEstimate: number;
    netImpactEstimate: number;
  };
  trend: Array<{
    date: string;
    lateHours: number;
    overtimeHours: number;
  }>;
  rows: Row[];
};

type ColumnDef = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
};

const columns: ColumnDef[] = [
  { key: "employeeCode", label: "Employee ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "totalDaysWorked", label: "Days Worked", render: (row) => String(row.totalDaysWorked || 0) },
  { key: "lateHours", label: "Late Hours", render: (row) => String(row.lateHours || 0) },
  { key: "overtimeHours", label: "OT Hours", render: (row) => String(row.overtimeHours || 0) },
  { key: "lateDeduction", label: "Late Deduction", render: (row) => formatMoney(row.lateDeduction) },
  { key: "overtimePay", label: "Overtime Pay", render: (row) => formatMoney(row.overtimePay) },
  { key: "netImpact", label: "Net Impact", render: (row) => formatMoney(row.netImpact) },
];

export function LateOvertimeReport() {
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
    columns.reduce<Record<string, boolean>>((state, column) => {
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
  const reportQuery = useQuery({
    queryKey: ["reports", "late-overtime", appliedFilters],
    queryFn: () => apiFetch<Response>(`reports/late-overtime${buildQueryString(appliedFilters)}`),
  });

  const rows = reportQuery.data?.rows || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.employeeCode, row.employeeName, row.store]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [rows, search]);

  const selectedColumns = columns.filter((column) => visibleColumns[column.key]);
  const trend = reportQuery.data?.trend || [];
  const trendMax = Math.max(1, ...trend.map((item) => item.lateHours + item.overtimeHours));

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Late & Overtime</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Track repeated lateness, overtime load, and estimated payroll impact by employee.
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
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.storeId} onChange={(event) => setDraftFilters((prev) => ({ ...prev, storeId: event.target.value }))}>
              <option value="">All stores</option>
              {(storesQuery.data || []).map((store) => (
                <option key={String(store.id)} value={String(store.id)}>
                  {formatStoreOptionLabel(store)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Group</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.groupId} onChange={(event) => setDraftFilters((prev) => ({ ...prev, groupId: event.target.value }))}>
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
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.employeeId} onChange={(event) => setDraftFilters((prev) => ({ ...prev, employeeId: event.target.value }))}>
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
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.status} onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="ACTIVE">Active</option>
              <option value="ALL">All statuses</option>
              <option value="AWOL">AWOL</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RESIGNED">Resigned</option>
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
      </section>

      {reportQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : reportQuery.isError ? (
        <section className="border-l-[4px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
          {(reportQuery.error as Error).message || "Unable to load late and overtime report."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Late Hours" value={String(reportQuery.data?.kpis.totalLateHours || 0)} />
            <KpiCard label="Overtime Hours" value={String(reportQuery.data?.kpis.totalOvertimeHours || 0)} />
            <KpiCard label="Late Deduction" value={formatMoney(reportQuery.data?.kpis.lateDeductionEstimate || 0)} />
            <KpiCard label="Overtime Pay" value={formatMoney(reportQuery.data?.kpis.overtimePayEstimate || 0)} />
            <KpiCard label="Net Impact" value={formatMoney(reportQuery.data?.kpis.netImpactEstimate || 0)} />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="border-b-[1.5px] border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Trend</h3>
              <p className="text-xs text-slate-500">Daily late versus overtime hours.</p>
            </div>
            <div className="overflow-x-auto px-3 py-3">
              <div className="min-w-[720px] space-y-2">
                {trend.map((item) => {
                  const total = item.lateHours + item.overtimeHours;
                  const width = total > 0 ? (total / trendMax) * 100 : 0;
                  return (
                    <div key={item.date} className="grid grid-cols-[110px_minmax(0,1fr)_180px] items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-600">{formatCell(item.date, "date")}</span>
                      <div className="h-3 overflow-hidden bg-slate-100">
                        <div className="flex h-full" style={{ width: `${width}%` }}>
                          <span className="h-full bg-amber-500" style={{ width: `${(item.lateHours / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-emerald-500" style={{ width: `${(item.overtimeHours / Math.max(total, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-right text-slate-600">Late: {item.lateHours}h | OT: {item.overtimeHours}h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or store" className="h-9" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  icon={<Download className="h-4 w-4" />}
                  onClick={() => exportRows(filteredRows)}
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
                        {columns.map((column) => (
                          <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-brand-600"
                              checked={visibleColumns[column.key]}
                              onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.key]: !prev[column.key] }))}
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
            <ReportTable rows={filteredRows} columns={selectedColumns} rowKey={(row) => `${row.employeeId}`} emptyLabel="No rows match the current filter/search." minWidthClassName="min-w-[980px]" />
          </section>
        </>
      )}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-[1.5px] border-line bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 font-slab text-2xl font-bold leading-none text-ink">{value}</p>
    </div>
  );
}

function exportRows(rows: Row[]) {
  const headers = ["Employee ID", "Employee Name", "Store", "Days Worked", "Late Hours", "Overtime Hours", "Late Deduction", "Overtime Pay", "Net Impact"];
  const lines = rows.map((row) =>
    [row.employeeCode, row.employeeName, row.store, row.totalDaysWorked, row.lateHours, row.overtimeHours, row.lateDeduction, row.overtimePay, row.netImpact]
      .map((value) => csvEscape(value))
      .join(","),
  );
  downloadTextFile(`late-overtime-${Date.now()}.csv`, [headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8;");
}
