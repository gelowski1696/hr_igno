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
import { StatusBadge } from "@/components/ui/status-badge";

type FilterState = {
  from: string;
  to: string;
  coverageFrom: string;
  coverageTo: string;
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
};

type Row = {
  id: number;
  payrollDate: string;
  payrollFrom?: string | null;
  payrollTo?: string | null;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store: string;
  daysOfWork: number;
  rate: number;
  gross: number;
  benefits: number;
  deductions: number;
  net: number;
  overtimeAmount: number;
  lateAmount: number;
  status: string;
};

type Response = {
  kpis: {
    grossTotal: number;
    deductionsTotal: number;
    netTotal: number;
    overtimePayTotal: number;
    lateDeductionTotal: number;
  };
  trend: Array<{
    date: string;
    gross: number;
    net: number;
  }>;
  rows: Row[];
};

type ColumnDef = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
};

const columns: ColumnDef[] = [
  { key: "payrollDate", label: "Payroll Date", render: (row) => formatCell(row.payrollDate, "date") },
  { key: "coverage", label: "Coverage", render: (row) => `${formatCell(row.payrollFrom, "date")} - ${formatCell(row.payrollTo, "date")}` },
  { key: "employeeCode", label: "Employee ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "daysOfWork", label: "Days", render: (row) => String(row.daysOfWork || 0) },
  { key: "rate", label: "Rate", render: (row) => formatMoney(row.rate) },
  { key: "gross", label: "Gross", render: (row) => formatMoney(row.gross) },
  { key: "benefits", label: "Benefits", render: (row) => formatMoney(row.benefits) },
  { key: "deductions", label: "Deductions", render: (row) => formatMoney(row.deductions) },
  { key: "net", label: "Net", render: (row) => formatMoney(row.net) },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
];

export function PayrollCostReport() {
  const defaults = useMemo(() => defaultManilaMonthRange(), []);
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    from: defaults.from,
    to: defaults.to,
    coverageFrom: "",
    coverageTo: "",
    storeId: "",
    groupId: "",
    employeeId: "",
    status: "",
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

  const storesQuery = useQuery({ queryKey: ["reports", "stores"], queryFn: () => listResource("stores") });
  const groupsQuery = useQuery({ queryKey: ["reports", "groups"], queryFn: () => listResource("employee-groups") });
  const employeesQuery = useQuery({ queryKey: ["reports", "employees"], queryFn: () => listResource("employees") });
  const reportQuery = useQuery({
    queryKey: ["reports", "payroll-cost", appliedFilters],
    queryFn: () => apiFetch<Response>(`reports/payroll-cost${buildQueryString(appliedFilters)}`),
  });

  const rows = reportQuery.data?.rows || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.employeeCode, row.employeeName, row.store, row.status]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [rows, search]);
  const selectedColumns = columns.filter((column) => visibleColumns[column.key]);
  const trend = reportQuery.data?.trend || [];
  const trendMax = Math.max(1, ...trend.map((item) => Math.max(item.gross, item.net)));

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Payroll Cost</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Compare gross, deductions, net pay, overtime, and late deductions by payroll period.
        </p>
      </header>

      <section className="border-[1.5px] border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Payroll From</span>
            <Input type="date" value={draftFilters.from} onChange={(event) => setDraftFilters((prev) => ({ ...prev, from: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Payroll To</span>
            <Input type="date" value={draftFilters.to} onChange={(event) => setDraftFilters((prev) => ({ ...prev, to: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Coverage From</span>
            <Input type="date" value={draftFilters.coverageFrom} onChange={(event) => setDraftFilters((prev) => ({ ...prev, coverageFrom: event.target.value }))} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Coverage To</span>
            <Input type="date" value={draftFilters.coverageTo} onChange={(event) => setDraftFilters((prev) => ({ ...prev, coverageTo: event.target.value }))} />
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
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Payroll Status</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.status} onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PREVIEWED">Previewed</option>
              <option value="RELEASED">Released</option>
              <option value="VOIDED">Voided</option>
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
              const next = { ...defaultManilaMonthRange(), coverageFrom: "", coverageTo: "", storeId: "", groupId: "", employeeId: "", status: "" };
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
          {(reportQuery.error as Error).message || "Unable to load payroll cost report."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Gross Total" value={formatMoney(reportQuery.data?.kpis.grossTotal || 0)} />
            <KpiCard label="Deductions" value={formatMoney(reportQuery.data?.kpis.deductionsTotal || 0)} />
            <KpiCard label="Net Total" value={formatMoney(reportQuery.data?.kpis.netTotal || 0)} />
            <KpiCard label="OT Pay Total" value={formatMoney(reportQuery.data?.kpis.overtimePayTotal || 0)} />
            <KpiCard label="Late Deduction" value={formatMoney(reportQuery.data?.kpis.lateDeductionTotal || 0)} />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="border-b-[1.5px] border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Period Trend</h3>
              <p className="text-xs text-slate-500">Gross versus net by payroll date.</p>
            </div>
            <div className="overflow-x-auto px-3 py-3">
              <div className="min-w-[720px] space-y-2">
                {trend.map((item) => (
                  <div key={item.date} className="grid grid-cols-[110px_minmax(0,1fr)_220px] items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-600">{formatCell(item.date, "date")}</span>
                    <div className="h-3 overflow-hidden bg-slate-100">
                      <div className="flex h-full" style={{ width: `${(Math.max(item.gross, item.net) / trendMax) * 100}%` }}>
                        <span className="h-full bg-blue-500" style={{ width: `${(item.gross / Math.max(Math.max(item.gross, item.net), 1)) * 100}%` }} />
                        <span className="h-full bg-emerald-500" style={{ width: `${(item.net / Math.max(Math.max(item.gross, item.net), 1)) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-right text-slate-600">Gross: {formatMoney(item.gross)} | Net: {formatMoney(item.net)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, store, status" className="h-9" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => exportRows(filteredRows)}>
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
                            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={visibleColumns[column.key]} onChange={() => setVisibleColumns((prev) => ({ ...prev, [column.key]: !prev[column.key] }))} />
                            <span>{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <ReportTable rows={filteredRows} columns={selectedColumns} rowKey={(row) => row.id} emptyLabel="No payroll rows match the current filter/search." minWidthClassName="min-w-[1260px]" />
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
  const headers = ["Payroll Date", "Coverage From", "Coverage To", "Employee ID", "Employee Name", "Store", "Days", "Rate", "Gross", "Benefits", "Deductions", "Net", "Status"];
  const lines = rows.map((row) =>
    [row.payrollDate, row.payrollFrom || "", row.payrollTo || "", row.employeeCode, row.employeeName, row.store, row.daysOfWork, row.rate, row.gross, row.benefits, row.deductions, row.net, row.status]
      .map((value) => csvEscape(value))
      .join(","),
  );
  downloadTextFile(`payroll-cost-${Date.now()}.csv`, [headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8;");
}
