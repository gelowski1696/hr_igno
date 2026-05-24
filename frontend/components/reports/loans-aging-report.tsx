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
  storeId: string;
  groupId: string;
  employeeId: string;
  status: string;
  type: string;
};

type Row = {
  id: number;
  atd?: string | null;
  dateIssued: string;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  store: string;
  type?: string | null;
  amount: number;
  totalPaid: number;
  balance: number;
  installmentPlan: number;
  paymentDue?: string | null;
  status: string;
  daysOutstanding: number;
  agingBucket: string;
};

type Response = {
  kpis: {
    pendingApprovalAmount: number;
    approvedUnpaidAmount: number;
    partialBalanceAmount: number;
    paidThisPeriod: number;
    totalOutstandingBalance: number;
  };
  aging: Array<{
    bucket: string;
    amount: number;
    count: number;
  }>;
  rows: Row[];
};

type ColumnDef = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
};

const columns: ColumnDef[] = [
  { key: "atd", label: "ATD", render: (row) => row.atd || "-" },
  { key: "dateIssued", label: "Date Issued", render: (row) => formatCell(row.dateIssued, "date") },
  { key: "employeeCode", label: "Employee ID", render: (row) => row.employeeCode || "-" },
  { key: "employeeName", label: "Employee", render: (row) => row.employeeName || "-" },
  { key: "store", label: "Store", render: (row) => row.store || "-" },
  { key: "type", label: "Type", render: (row) => row.type || "-" },
  { key: "amount", label: "Amount", render: (row) => formatMoney(row.amount) },
  { key: "totalPaid", label: "Paid", render: (row) => formatMoney(row.totalPaid) },
  { key: "balance", label: "Balance", render: (row) => formatMoney(row.balance) },
  { key: "installmentPlan", label: "Installments", render: (row) => String(row.installmentPlan || 0) },
  { key: "paymentDue", label: "Payment Due", render: (row) => formatCell(row.paymentDue, "date") },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
  { key: "agingBucket", label: "Aging", render: (row) => row.agingBucket },
];

export function LoansAgingReport() {
  const defaults = useMemo(() => defaultManilaMonthRange(), []);
  const [draftFilters, setDraftFilters] = useState<FilterState>({
    from: defaults.from,
    to: defaults.to,
    storeId: "",
    groupId: "",
    employeeId: "",
    status: "",
    type: "",
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
    queryKey: ["reports", "loans-aging", appliedFilters],
    queryFn: () => apiFetch<Response>(`reports/loans-aging${buildQueryString(appliedFilters)}`),
  });

  const rows = reportQuery.data?.rows || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.atd, row.employeeCode, row.employeeName, row.store, row.type, row.status, row.agingBucket]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(term),
    );
  }, [rows, search]);
  const selectedColumns = columns.filter((column) => visibleColumns[column.key]);
  const aging = reportQuery.data?.aging || [];
  const agingMax = Math.max(1, ...aging.map((item) => item.amount));

  return (
    <section className="w-full space-y-5">
      <header className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Reports</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Loans & Advances Aging</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Monitor unpaid balances, aging buckets, and payment movement across loans and advances.
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
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Status</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.status} onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Type</span>
            <select className="h-9 w-full border border-line bg-white px-3 text-sm text-ink" value={draftFilters.type} onChange={(event) => setDraftFilters((prev) => ({ ...prev, type: event.target.value }))}>
              <option value="">All types</option>
              <option value="Cash Advance">Cash Advance</option>
              <option value="Loan">Loan</option>
              <option value="SSS Loan">SSS Loan</option>
              <option value="PAG-IBIG Loan">PAG-IBIG Loan</option>
              <option value="PHILHEALTH Loan">PHILHEALTH Loan</option>
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
              const next = { ...defaultManilaMonthRange(), storeId: "", groupId: "", employeeId: "", status: "", type: "" };
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
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : reportQuery.isError ? (
        <section className="border-l-[4px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
          {(reportQuery.error as Error).message || "Unable to load loans aging report."}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Pending Approval" value={formatMoney(reportQuery.data?.kpis.pendingApprovalAmount || 0)} />
            <KpiCard label="Approved Unpaid" value={formatMoney(reportQuery.data?.kpis.approvedUnpaidAmount || 0)} />
            <KpiCard label="Partial Balance" value={formatMoney(reportQuery.data?.kpis.partialBalanceAmount || 0)} />
            <KpiCard label="Paid This Period" value={formatMoney(reportQuery.data?.kpis.paidThisPeriod || 0)} />
            <KpiCard label="Outstanding" value={formatMoney(reportQuery.data?.kpis.totalOutstandingBalance || 0)} />
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="border-b-[1.5px] border-line px-4 py-3">
              <h3 className="text-sm font-bold text-ink">Aging Buckets</h3>
              <p className="text-xs text-slate-500">Outstanding balance grouped by days outstanding.</p>
            </div>
            <div className="overflow-x-auto px-3 py-3">
              <div className="min-w-[720px] space-y-2">
                {aging.map((item) => (
                  <div key={item.bucket} className="grid grid-cols-[90px_minmax(0,1fr)_240px] items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-600">{item.bucket}</span>
                    <div className="h-3 overflow-hidden bg-slate-100">
                      <div className="h-full bg-brand-600" style={{ width: `${(item.amount / agingMax) * 100}%` }} />
                    </div>
                    <span className="text-right text-slate-600">
                      {formatMoney(item.amount)} ({item.count} {item.count === 1 ? "record" : "records"})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-2 border-b-[1.5px] border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="w-full md:max-w-sm">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ATD, employee, type, status" className="h-9" />
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
            <ReportTable rows={filteredRows} columns={selectedColumns} rowKey={(row) => row.id} emptyLabel="No loan/advance rows match the current filter/search." minWidthClassName="min-w-[1340px]" />
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
  const headers = ["ATD", "Date Issued", "Employee ID", "Employee Name", "Store", "Type", "Amount", "Total Paid", "Balance", "Installments", "Payment Due", "Status", "Aging Bucket"];
  const lines = rows.map((row) =>
    [row.atd || "", row.dateIssued, row.employeeCode, row.employeeName, row.store, row.type || "", row.amount, row.totalPaid, row.balance, row.installmentPlan, row.paymentDue || "", row.status, row.agingBucket]
      .map((value) => csvEscape(value))
      .join(","),
  );
  downloadTextFile(`loans-aging-${Date.now()}.csv`, [headers.join(","), ...lines].join("\n"), "text/csv;charset=utf-8;");
}
