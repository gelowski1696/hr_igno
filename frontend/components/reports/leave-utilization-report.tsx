"use client";

import { useQuery } from "@tanstack/react-query";
import { Columns3, Download, Filter } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { apiFetch, listResource } from "@/lib/api";
import { formatCell } from "@/lib/formatters";
import { ReportTable } from "@/components/reports/report-table";
import { buildQueryString, csvEscape, defaultManilaMonthRange, downloadTextFile, formatEmployeeOptionLabel, formatStoreOptionLabel } from "@/components/reports/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

type FilterState = {
  from: string;
  to: string;
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
  leaveType: string;
};

type RequestRow = {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store: string;
  leaveType: string;
  dateFiled: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: string;
  approver?: string | null;
  reason?: string | null;
};

type BalanceRow = {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store: string;
  vacationTotal: number;
  vacationUsed: number;
  vacationRemaining: number;
  sickTotal: number;
  sickUsed: number;
  sickRemaining: number;
};

type Response = {
  kpis: {
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    avgLeaveDaysPerRequest: number;
    totalRequests: number;
  };
  trend: Array<{
    month: string;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }>;
  rows: RequestRow[];
  balances: BalanceRow[];
};

type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

const requestColumns: Array<ColumnDef<RequestRow>> = [
  { key: "employeeCode", label: "Employee ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "leaveType", label: "Leave Type", render: (row) => row.leaveType || "-" },
  { key: "dateFiled", label: "Date Filed", render: (row) => formatCell(row.dateFiled, "date") },
  { key: "startDate", label: "Start", render: (row) => formatCell(row.startDate, "date") },
  { key: "endDate", label: "End", render: (row) => formatCell(row.endDate, "date") },
  { key: "duration", label: "Days", render: (row) => String(row.duration || 0) },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
  { key: "approver", label: "Approver", render: (row) => row.approver || "-" },
  { key: "reason", label: "Reason", render: (row) => row.reason || "-" },
];

const balanceColumns: Array<ColumnDef<BalanceRow>> = [
  { key: "employeeCode", label: "Employee ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "vacationTotal", label: "VL Total", render: (row) => String(row.vacationTotal || 0) },
  { key: "vacationUsed", label: "VL Used", render: (row) => String(row.vacationUsed || 0) },
  { key: "vacationRemaining", label: "VL Remaining", render: (row) => String(row.vacationRemaining || 0) },
  { key: "sickTotal", label: "SL Total", render: (row) => String(row.sickTotal || 0) },
  { key: "sickUsed", label: "SL Used", render: (row) => String(row.sickUsed || 0) },
  { key: "sickRemaining", label: "SL Remaining", render: (row) => String(row.sickRemaining || 0) },
];

export function LeaveUtilizationReport() {
  const defaults = useMemo(() => defaultManilaMonthRange(), []);
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    from: defaults.from,
    to: defaults.to,
    storeId: "",
    groupId: "",
    employeeId: "",
    status: "",
    leaveType: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(draftFilters);
  const [search, setSearch] = useState("");
  const [balanceSearch, setBalanceSearch] = useState("");
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    requestColumns.reduce<Record<string, boolean>>((state, column) => {
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
    queryKey: ["reports", "leave-utilization", appliedFilters],
    queryFn: () => apiFetch<Response>(`reports/leave-utilization${buildQueryString(appliedFilters)}`),
  });

  const requestRows = reportQuery.data?.rows || [];
  const balanceRows = reportQuery.data?.balances || [];
  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requestRows;
    return requestRows.filter((row) =>
      [row.employeeCode, row.employeeName, row.store, row.leaveType, row.status, row.reason]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [requestRows, search]);
  const filteredBalances = useMemo(() => {
    const term = balanceSearch.trim().toLowerCase();
    if (!term) return balanceRows;
    return balanceRows.filter((row) =>
      [row.employeeCode, row.employeeName, row.store]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [balanceRows, balanceSearch]);

  const selectedColumns = requestColumns.filter((column) => visibleColumns[column.key]);
  const trend = reportQuery.data?.trend || [];
  const trendMax = Math.max(1, ...trend.map((item) => item.pending + item.approved + item.rejected + item.cancelled));

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Leave Utilization</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review leave request flow and balance usage by employee, group, and store.
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
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Leave Status</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.status} onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Leave Type</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.leaveType} onChange={(event) => setDraftFilters((prev) => ({ ...prev, leaveType: event.target.value }))}>
              <option value="">All leave types</option>
              <option value="Vacation">Vacation</option>
              <option value="Sick">Sick</option>
              <option value="Lwop">LWOP</option>
              <option value="HalfAM">Half Day AM</option>
              <option value="HalfPM">Half Day PM</option>
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
              const next = { ...defaultManilaMonthRange(), storeId: "", groupId: "", employeeId: "", status: "", leaveType: "" };
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
          <Skeleton className="h-72 w-full" />
        </div>
      ) : reportQuery.isError ? (
        <section className="border-l-[4px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
          {(reportQuery.error as Error).message || "Unable to load leave utilization report."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total Requests" value={String(reportQuery.data?.kpis.totalRequests || 0)} />
            <KpiCard label="Pending" value={String(reportQuery.data?.kpis.pendingRequests || 0)} />
            <KpiCard label="Approved" value={String(reportQuery.data?.kpis.approvedRequests || 0)} />
            <KpiCard label="Rejected" value={String(reportQuery.data?.kpis.rejectedRequests || 0)} />
            <KpiCard label="Avg Days/Request" value={String(reportQuery.data?.kpis.avgLeaveDaysPerRequest || 0)} />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="border-b-[1.5px] border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Monthly Trend</h3>
              <p className="text-xs text-slate-500">Request count by status per month.</p>
            </div>
            <div className="overflow-x-auto px-3 py-3">
              <div className="min-w-[700px] space-y-2">
                {trend.map((item) => {
                  const total = item.pending + item.approved + item.rejected + item.cancelled;
                  const width = total > 0 ? (total / trendMax) * 100 : 0;
                  return (
                    <div key={item.month} className="grid grid-cols-[110px_minmax(0,1fr)_210px] items-center gap-3 text-xs">
                      <span className="font-semibold text-slate-600">{item.month}</span>
                      <div className="h-3 overflow-hidden bg-slate-100">
                        <div className="flex h-full" style={{ width: `${width}%` }}>
                          <span className="h-full bg-amber-500" style={{ width: `${(item.pending / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-emerald-500" style={{ width: `${(item.approved / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-rose-500" style={{ width: `${(item.rejected / Math.max(total, 1)) * 100}%` }} />
                          <span className="h-full bg-slate-400" style={{ width: `${(item.cancelled / Math.max(total, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-right text-slate-600">
                        P:{item.pending} A:{item.approved} R:{item.rejected} C:{item.cancelled}
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
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, leave type, reason" className="h-9" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => exportRequestsCsv(filteredRequests)}>
                  Export Requests CSV
                </Button>
                <div className="relative">
                  <Button variant="secondary" icon={<Columns3 className="h-4 w-4" />} onClick={() => setColumnMenuOpen((open) => !open)}>
                    Columns
                  </Button>
                  {columnMenuOpen ? (
                    <div className="absolute right-0 top-10 z-20 w-56 border border-line bg-white p-3 shadow-lg">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Visible columns</p>
                      <div className="space-y-1.5">
                        {requestColumns.map((column) => (
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
            <ReportTable rows={filteredRequests} columns={selectedColumns} rowKey={(row) => row.id} emptyLabel="No leave requests match the current filter/search." minWidthClassName="min-w-[1260px]" />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-sm font-bold text-ink">Leave Balances</h3>
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                <div className="w-full md:w-72">
                  <Input value={balanceSearch} onChange={(event) => setBalanceSearch(event.target.value)} placeholder="Search employee or store" className="h-9" />
                </div>
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={() => exportBalancesCsv(filteredBalances)}>
                  Export Balances CSV
                </Button>
              </div>
            </div>
            <ReportTable rows={filteredBalances} columns={balanceColumns} rowKey={(row) => row.employeeId} emptyLabel="No leave balances found for this filter/search." minWidthClassName="min-w-[980px]" />
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

function exportRequestsCsv(rows: RequestRow[]) {
  const headers = ["Employee ID", "Employee Name", "Store", "Leave Type", "Date Filed", "Start", "End", "Duration", "Status", "Approver", "Reason"];
  const lines = rows.map((row) =>
    [row.employeeCode, row.employeeName, row.store, row.leaveType, row.dateFiled, row.startDate, row.endDate, row.duration, row.status, row.approver || "", row.reason || ""]
      .map((value) => csvEscape(value))
      .join(","),
  );
  downloadTextFile(`leave-utilization-requests-${Date.now()}.csv`, [headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8;");
}

function exportBalancesCsv(rows: BalanceRow[]) {
  const headers = ["Employee ID", "Employee Name", "Store", "VL Total", "VL Used", "VL Remaining", "SL Total", "SL Used", "SL Remaining"];
  const lines = rows.map((row) =>
    [row.employeeCode, row.employeeName, row.store, row.vacationTotal, row.vacationUsed, row.vacationRemaining, row.sickTotal, row.sickUsed, row.sickRemaining]
      .map((value) => csvEscape(value))
      .join(","),
  );
  downloadTextFile(`leave-utilization-balances-${Date.now()}.csv`, [headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8;");
}
