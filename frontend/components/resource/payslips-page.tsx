"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, FileDown, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { listResource } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/formatters";
import type { ApiRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type PayslipRow = {
  id: number;
  employeeId: number | null;
  employeeCode: string;
  employeeName: string;
  storeArea: string;
  status: string;
  payMethod: string;
  payrollFrom: string;
  payrollTo: string;
  payrollDate: string;
  daysOfWork: number;
  rate: number;
  totalRegularWage: number;
  overtimeAmount: number;
  addOnHoliday: number;
  bonusRate: number;
  allowance: number;
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  valeDeduction: number;
  loanDeduction: number;
  sssLoan: number;
  pagibigLoan: number;
  philhealthLoan: number;
  lateAmount: number;
  penaltyOrUndertime: number;
  penaltyRate: number;
  pondo: number;
  charge: number;
  credit: number;
  totalAllowance: number;
  otherDeduction: number;
  totalAmount: number;
  netAmountPaid: number;
};

export function PayslipsPage() {
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("RELEASED");
  const [methodFilter, setMethodFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const payrollQuery = useQuery({
    queryKey: ["payslips", "payroll"],
    queryFn: () => listResource("payroll"),
  });

  const rows = useMemo(() => {
    return (payrollQuery.data || [])
      .map((record) => normalizePayslip(record))
      .filter((row): row is PayslipRow => Boolean(row))
      .sort((left, right) => readTime(right.payrollDate || right.payrollTo) - readTime(left.payrollDate || left.payrollTo));
  }, [payrollQuery.data]);

  const periodOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      const source = row.payrollTo || row.payrollFrom || row.payrollDate;
      const key = source ? source.slice(0, 7) : "";
      if (key) keys.add(key);
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status.toUpperCase() !== statusFilter) return false;
      if (methodFilter !== "all" && row.payMethod.toLowerCase() !== methodFilter.toLowerCase()) return false;
      if (periodFilter !== "all") {
        const source = row.payrollTo || row.payrollFrom || row.payrollDate;
        if (!source.startsWith(periodFilter)) return false;
      }
      if (!term) return true;
      return `${row.employeeCode} ${row.employeeName} ${row.storeArea} ${row.payMethod}`.toLowerCase().includes(term);
    });
  }, [methodFilter, periodFilter, rows, search, statusFilter]);

  const selected = useMemo(() => {
    if (!filteredRows.length) return null;
    if (selectedId === null) return filteredRows[0];
    return filteredRows.find((row) => row.id === selectedId) || filteredRows[0];
  }, [filteredRows, selectedId]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (accumulator, row) => {
        accumulator.net += row.netAmountPaid;
        accumulator.gross += row.totalRegularWage;
        accumulator.deductions += row.totalAllowance + row.otherDeduction + row.charge;
        return accumulator;
      },
      { net: 0, gross: 0, deductions: 0 },
    );
  }, [filteredRows]);

  useEffect(() => {
    if (!selected) {
      setSelectedId(null);
      return;
    }
    if (selectedId !== selected.id) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <section className="w-full">
      <div className="border-b-[1.5px] border-line pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Payroll</p>
        <h2 className="mt-1 font-slab text-[25px] font-bold leading-8 text-ink sm:text-[28px] sm:leading-9">Payslips</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Review released payroll records in a payslip workspace with queue, preview, and quick document actions.
        </p>
      </div>

      <div className="mt-4 border-[1.5px] border-line bg-field p-3">
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_170px_170px_170px]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-md pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find by employee ID, name, store, method"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Period</span>
            <select
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
            >
              <option value="all">All periods</option>
              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Status</span>
            <select
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="RELEASED">Released</option>
              <option value="DRAFT">Draft</option>
              <option value="PREVIEWED">Previewed</option>
              <option value="VOIDED">Voided</option>
              <option value="all">All statuses</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Method</span>
            <select
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
            >
              <option value="all">All methods</option>
              <option value="Cash">Cash</option>
              <option value="Gcash">Gcash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="rounded-md border border-line bg-white px-2.5 py-1">{filteredRows.length} payslip(s)</span>
        <span className="rounded-md border border-line bg-white px-2.5 py-1">Gross {formatMoney(summary.gross)}</span>
        <span className="rounded-md border border-line bg-white px-2.5 py-1">Deductions {formatMoney(summary.deductions)}</span>
        <span className="rounded-md border border-line bg-white px-2.5 py-1">Net {formatMoney(summary.net)}</span>
        {notice ? <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">{notice}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="min-h-[620px] border-[1.5px] border-line bg-white">
          <header className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Payslip Queue</p>
            <span className="text-xs font-semibold text-slate-500">{filteredRows.length}</span>
          </header>
          <div className="max-h-[740px] overflow-y-auto">
            {payrollQuery.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payslips...
              </div>
            ) : payrollQuery.isError ? (
              <p className="px-3 py-4 text-sm text-signal-red">{(payrollQuery.error as Error).message || "Unable to load payslips."}</p>
            ) : filteredRows.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No payslips found for the current filters.</p>
            ) : (
              filteredRows.map((row) => {
                const isActive = selected?.id === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={
                      isActive
                        ? "w-full border-b border-line bg-brand-50 px-3 py-2.5 text-left"
                        : "w-full border-b border-line px-3 py-2.5 text-left hover:bg-slate-50"
                    }
                    onClick={() => setSelectedId(row.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-mono font-semibold text-slate-600">{row.employeeCode}</p>
                        <p className="truncate text-sm font-semibold text-ink">{row.employeeName}</p>
                        <p className="truncate text-xs text-slate-500">{formatRange(row.payrollFrom, row.payrollTo)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">{formatMoney(row.netAmountPaid)}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.storeArea || "-"}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-h-[620px] border-[1.5px] border-line bg-white">
          {!selected ? (
            <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
              Select a payslip from the queue to preview details.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-600">Document Preview</p>
                  <h3 className="text-base font-bold text-ink">Payslip #{String(selected.id).padStart(6, "0")}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={selected.status} />
                  <Button variant="secondary" className="h-8 rounded-md px-2.5 text-xs" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => void copySummary(selected, setNotice)}>
                    Copy
                  </Button>
                  <Button
                    className="h-8 rounded-md px-2.5 text-xs"
                    icon={<FileDown className="h-3.5 w-3.5" />}
                    onClick={() => void generatePayslipPdf(selected, setNotice)}
                  >
                    Generate PDF
                  </Button>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
                <article className="mx-auto max-w-[880px] border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">VMJAMTECH HR</p>
                      <h4 className="mt-1 text-xl font-bold text-ink">Employee Payslip</h4>
                      <p className="mt-1 text-sm text-slate-600">{formatRange(selected.payrollFrom, selected.payrollTo)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Issued</p>
                      <p className="text-sm font-semibold text-ink">{formatDate(selected.payrollDate || selected.payrollTo || selected.payrollFrom)}</p>
                      <p className="mt-1 text-xs text-slate-500">{selected.payMethod || "-"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 border-b border-line py-4 sm:grid-cols-4">
                    <InfoItem label="Employee" value={selected.employeeName} />
                    <InfoItem label="ID" value={selected.employeeCode} />
                    <InfoItem label="Store" value={selected.storeArea || "-"} />
                    <InfoItem label="Days Worked" value={formatCount(selected.daysOfWork)} />
                  </div>

                  <div className="grid gap-4 py-4 lg:grid-cols-2">
                    <table className="w-full border border-line text-sm">
                      <thead>
                        <tr>
                          <th className="border-b border-line bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Earnings</th>
                          <th className="border-b border-line bg-muted px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <MoneyRow label="Regular Wage" value={selected.totalRegularWage} />
                        <MoneyRow label="Overtime" value={selected.overtimeAmount} />
                        <MoneyRow label="Leave / Holiday" value={selected.addOnHoliday} />
                        <MoneyRow label="Allowance" value={selected.allowance} />
                        <MoneyRow label="Bonus" value={selected.bonusRate} />
                        <MoneyRow label="Credit" value={selected.credit} />
                        <MoneyRow label="Total Earnings" value={selected.totalAmount} strong />
                      </tbody>
                    </table>

                    <table className="w-full border border-line text-sm">
                      <thead>
                        <tr>
                          <th className="border-b border-line bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Deductions</th>
                          <th className="border-b border-line bg-muted px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <MoneyRow label="SSS" value={selected.sssDeduction} />
                        <MoneyRow label="PhilHealth" value={selected.philhealthDeduction} />
                        <MoneyRow label="Pag-IBIG" value={selected.pagibigDeduction} />
                        <MoneyRow label="Cash Advance" value={selected.valeDeduction} />
                        <MoneyRow label="Loan" value={selected.loanDeduction + selected.sssLoan + selected.pagibigLoan + selected.philhealthLoan} />
                        <MoneyRow label="Late / Undertime / Penalty" value={selected.lateAmount + selected.penaltyOrUndertime + selected.penaltyRate} />
                        <MoneyRow label="Other Deduction" value={selected.otherDeduction + selected.charge + selected.pondo} />
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-1 border-t border-line pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-600">Net Salary</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatMoney(selected.netAmountPaid)}</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function MoneyRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <tr>
      <td className={strong ? "border-b border-line px-3 py-2 font-semibold text-ink" : "border-b border-line px-3 py-2 text-slate-700"}>{label}</td>
      <td className={strong ? "border-b border-line px-3 py-2 text-right font-semibold text-ink" : "border-b border-line px-3 py-2 text-right text-slate-700"}>
        {formatMoney(value)}
      </td>
    </tr>
  );
}

function normalizePayslip(record: ApiRecord): PayslipRow | null {
  const id = Number(record.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const employeeRaw = record.employee && typeof record.employee === "object" ? (record.employee as Record<string, unknown>) : null;
  const employeeId = Number(record.employeeId ?? employeeRaw?.id ?? 0);
  const employeeCode = String(employeeRaw?.employeeCode ?? employeeRaw?.employee_code ?? "").trim() || `EMP-${employeeId || id}`;
  const firstName = String(employeeRaw?.firstName ?? employeeRaw?.first_name ?? "").trim();
  const lastName = String(employeeRaw?.lastName ?? employeeRaw?.last_name ?? "").trim();
  const employeeName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unknown Employee";
  const storeArea = String(
    employeeRaw?.storeArea ??
      employeeRaw?.store_area ??
      (employeeRaw?.store && typeof employeeRaw.store === "object"
        ? ((employeeRaw.store as Record<string, unknown>).area ?? "")
        : ""),
  ).trim();

  return {
    id,
    employeeId: Number.isInteger(employeeId) && employeeId > 0 ? employeeId : null,
    employeeCode,
    employeeName,
    storeArea,
    status: String(record.status || "DRAFT").toUpperCase(),
    payMethod: String(record.payMethod ?? record.paymethod ?? "Cash"),
    payrollFrom: readDateOnly(record.payrollFrom ?? record.payroll_from),
    payrollTo: readDateOnly(record.payrollTo ?? record.payroll_to),
    payrollDate: readDateOnly(record.payrollDate ?? record.payroll_date ?? record.createdAt),
    daysOfWork: toNumber(record.daysOfWork ?? record.days_of_work),
    rate: toNumber(record.rate),
    totalRegularWage: toNumber(record.totalRegularWage ?? record.total_regular_wage),
    overtimeAmount: toNumber(record.overtimeAmount ?? record.overtime_amount),
    addOnHoliday: toNumber(record.addOnHoliday ?? record.add_on_holiday),
    bonusRate: toNumber(record.bonusRate ?? record.bonus_rate),
    allowance: toNumber(record.allowance),
    sssDeduction: toNumber(record.sssDeduction ?? record.sss_deduction),
    philhealthDeduction: toNumber(record.philhealthDeduction ?? record.philhealth_deduction),
    pagibigDeduction: toNumber(record.pagibigDeduction ?? record.pagibig_deduction),
    valeDeduction: toNumber(record.valeDeduction ?? record.vale_deduction),
    loanDeduction: toNumber(record.loanDeduction ?? record.loan_deduction),
    sssLoan: toNumber(record.sssLoan ?? record.sssloan),
    pagibigLoan: toNumber(record.pagibigLoan ?? record.pagibigloan),
    philhealthLoan: toNumber(record.philhealthLoan ?? record.philhealthloan),
    lateAmount: toNumber(record.lateAmount ?? record.late_amount),
    penaltyOrUndertime: toNumber(record.penaltyOrUndertime ?? record.penalty_or_undertime),
    penaltyRate: toNumber(record.penaltyRate ?? record.penalty_rate),
    pondo: toNumber(record.pondo),
    charge: toNumber(record.charge),
    credit: toNumber(record.credit),
    totalAllowance: toNumber(record.totalAllowance ?? record.total_allowance),
    otherDeduction: toNumber(record.otherDeduction ?? record.other_deduction),
    totalAmount: toNumber(record.totalAmount ?? record.total_amount),
    netAmountPaid: toNumber(record.netAmountPaid ?? record.net_amount_paid),
  };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readDateOnly(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function readTime(value: string) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatPeriod(period: string) {
  const parsed = new Date(`${period}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parsed);
}

function formatRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "-";
  if (!startDate) return formatDate(endDate);
  if (!endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatCount(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

async function copySummary(row: PayslipRow, setNotice: (value: string) => void) {
  const text = [
    `Payslip #${String(row.id).padStart(6, "0")}`,
    `Employee ID: ${row.employeeCode} - ${row.employeeName}`,
    `Period: ${formatRange(row.payrollFrom, row.payrollTo)}`,
    `Status: ${row.status}`,
    `Method: ${row.payMethod}`,
    `Gross: ${formatMoney(row.totalRegularWage)}`,
    `Net: ${formatMoney(row.netAmountPaid)}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    setNotice("Payslip summary copied.");
  } catch {
    setNotice("Unable to copy summary.");
  }
}

async function generatePayslipPdf(row: PayslipRow, setNotice: (value: string) => void) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const margin = 34;
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardX = margin;
    const cardY = 34;
    const cardW = pageWidth - margin * 2;
    const cardH = 742;
    const right = cardX + cardW - 18;

    const brandBlue: [number, number, number] = [30, 64, 175];
    const slate900: [number, number, number] = [15, 23, 42];
    const slate600: [number, number, number] = [71, 85, 105];
    const slate500: [number, number, number] = [100, 116, 139];
    const line: [number, number, number] = [226, 232, 240];
    const muted: [number, number, number] = [248, 250, 252];
    const green700: [number, number, number] = [4, 120, 87];

    const earningsRows: PdfPayslipLine[] = [
      { label: "Regular Wage", amount: row.totalRegularWage },
      { label: "Overtime", amount: row.overtimeAmount },
      { label: "Leave / Holiday", amount: row.addOnHoliday },
      { label: "Allowance", amount: row.allowance },
      { label: "Bonus", amount: row.bonusRate },
      { label: "Credit", amount: row.credit },
      { label: "Total Earnings", amount: row.totalAmount, strong: true },
    ];
    const deductionsRows: PdfPayslipLine[] = [
      { label: "SSS", amount: row.sssDeduction },
      { label: "PhilHealth", amount: row.philhealthDeduction },
      { label: "Pag-IBIG", amount: row.pagibigDeduction },
      { label: "Cash Advance", amount: row.valeDeduction },
      { label: "Loan", amount: row.loanDeduction + row.sssLoan + row.pagibigLoan + row.philhealthLoan },
      { label: "Late / Undertime / Penalty", amount: row.lateAmount + row.penaltyOrUndertime + row.penaltyRate },
      { label: "Other Deduction", amount: row.otherDeduction + row.charge + row.pondo },
    ];

    doc.setDrawColor(...line);
    doc.setFillColor(255, 255, 255);
    doc.rect(cardX, cardY, cardW, cardH, "FD");

    let y = cardY + 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...brandBlue);
    doc.text("VMJAMTECH HR", cardX + 18, y);

    y += 18;
    doc.setTextColor(...slate900);
    doc.setFontSize(20);
    doc.text("Employee Payslip", cardX + 18, y);

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slate600);
    doc.text(formatRange(row.payrollFrom, row.payrollTo), cardX + 18, y);

    const headerRightTop = cardY + 28;
    doc.setTextColor(...slate500);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Issued", right, headerRightTop, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate900);
    doc.setFontSize(10);
    doc.text(formatDate(row.payrollDate || row.payrollTo || row.payrollFrom), right, headerRightTop + 13, { align: "right" });
    doc.setTextColor(...slate500);
    doc.setFontSize(9);
    doc.text(row.payMethod || "-", right, headerRightTop + 27, { align: "right" });
    doc.setTextColor(...slate900);
    doc.setFont("helvetica", "bold");
    doc.text(`Payslip #${String(row.id).padStart(6, "0")}`, right, headerRightTop + 42, { align: "right" });

    const firstDividerY = cardY + 102;
    doc.setDrawColor(...line);
    doc.line(cardX + 18, firstDividerY, cardX + cardW - 18, firstDividerY);

    const infoY = firstDividerY + 14;
    const infoGap = 10;
    const infoBoxW = (cardW - 36 - infoGap * 3) / 4;
    const infoBoxH = 56;
    drawPdfInfoBox(doc, cardX + 18 + (infoBoxW + infoGap) * 0, infoY, infoBoxW, infoBoxH, "Employee", row.employeeName, line, muted, slate500, slate900);
    drawPdfInfoBox(doc, cardX + 18 + (infoBoxW + infoGap) * 1, infoY, infoBoxW, infoBoxH, "ID", row.employeeCode, line, muted, slate500, slate900);
    drawPdfInfoBox(doc, cardX + 18 + (infoBoxW + infoGap) * 2, infoY, infoBoxW, infoBoxH, "Store", row.storeArea || "-", line, muted, slate500, slate900);
    drawPdfInfoBox(doc, cardX + 18 + (infoBoxW + infoGap) * 3, infoY, infoBoxW, infoBoxH, "Days Worked", formatCount(row.daysOfWork), line, muted, slate500, slate900);

    const tablesY = infoY + infoBoxH + 20;
    const tablesGap = 14;
    const tableW = (cardW - 36 - tablesGap) / 2;
    const leftTableH = drawPdfTableSection(doc, {
      x: cardX + 18,
      y: tablesY,
      width: tableW,
      title: "Earnings",
      rows: earningsRows,
      line,
      muted,
      slate600,
      slate900,
    });
    const rightTableH = drawPdfTableSection(doc, {
      x: cardX + 18 + tableW + tablesGap,
      y: tablesY,
      width: tableW,
      title: "Deductions",
      rows: deductionsRows,
      line,
      muted,
      slate600,
      slate900,
    });

    const netY = tablesY + Math.max(leftTableH, rightTableH) + 24;
    doc.setDrawColor(...line);
    doc.line(cardX + 18, netY - 12, cardX + cardW - 18, netY - 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...slate600);
    doc.text("Net Salary", cardX + 18, netY + 6);
    doc.setFontSize(24);
    doc.setTextColor(...green700);
    doc.text(formatPdfMoney(row.netAmountPaid), right, netY + 10, { align: "right" });
    doc.setTextColor(...slate900);

    const suffix = (row.payrollTo || row.payrollFrom || row.payrollDate || "payslip").replace(/[^0-9-]/g, "");
    const filename = `Payslip-${row.employeeCode || row.id}-${suffix}.pdf`;
    doc.save(filename);
    setNotice("PDF generated.");
  } catch {
    setNotice("Unable to generate PDF.");
  }
}

type PdfPayslipLine = {
  label: string;
  amount: number;
  strong?: boolean;
};

type PdfTableArgs = {
  x: number;
  y: number;
  width: number;
  title: string;
  rows: PdfPayslipLine[];
  line: [number, number, number];
  muted: [number, number, number];
  slate600: [number, number, number];
  slate900: [number, number, number];
};

function drawPdfInfoBox(
  doc: {
    setDrawColor: (...args: number[]) => void;
    setFillColor: (...args: number[]) => void;
    rect: (x: number, y: number, w: number, h: number, style?: string) => void;
    setFont: (fontName: string, fontStyle: string) => void;
    setFontSize: (size: number) => void;
    setTextColor: (...args: number[]) => void;
    text: (text: string | string[], x: number, y: number, options?: { align?: "left" | "center" | "right" }) => void;
    splitTextToSize: (text: string, size: number) => string[];
  },
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  line: [number, number, number],
  muted: [number, number, number],
  slate500: [number, number, number],
  slate900: [number, number, number],
) {
  doc.setDrawColor(...line);
  doc.setFillColor(...muted);
  doc.rect(x, y, w, h, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...slate500);
  doc.text(label.toUpperCase(), x + 8, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...slate900);
  const wrapped = doc.splitTextToSize(value || "-", w - 16).slice(0, 2);
  doc.text(wrapped, x + 8, y + 30);
}

function drawPdfTableSection(
  doc: {
    setDrawColor: (...args: number[]) => void;
    setFillColor: (...args: number[]) => void;
    rect: (x: number, y: number, w: number, h: number, style?: string) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
    setFont: (fontName: string, fontStyle: string) => void;
    setFontSize: (size: number) => void;
    setTextColor: (...args: number[]) => void;
    text: (text: string | string[], x: number, y: number, options?: { align?: "left" | "center" | "right" }) => void;
    splitTextToSize: (text: string, size: number) => string[];
  },
  args: PdfTableArgs,
) {
  const { x, y, width, title, rows, line, muted, slate600, slate900 } = args;
  const headerH = 24;
  const rowH = 22;
  const height = headerH + rows.length * rowH;
  const amountColumnW = 118;

  doc.setDrawColor(...line);
  doc.rect(x, y, width, height);
  doc.setFillColor(...muted);
  doc.rect(x, y, width, headerH, "F");
  doc.line(x + width - amountColumnW, y, x + width - amountColumnW, y + height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...slate600);
  doc.text(title.toUpperCase(), x + 10, y + 15);
  doc.text("AMOUNT", x + width - 10, y + 15, { align: "right" });

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowTop = y + headerH + index * rowH;
    doc.line(x, rowTop, x + width, rowTop);

    const style = row.strong ? "bold" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(9);
    doc.setTextColor(...slate900);
    const labelLines = doc.splitTextToSize(row.label, width - amountColumnW - 16);
    doc.text(labelLines.slice(0, 2), x + 8, rowTop + 14);
    doc.text(formatPdfMoney(row.amount), x + width - 10, rowTop + 14, { align: "right" });
  }

  return height;
}

function formatPdfMoney(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `PHP ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
