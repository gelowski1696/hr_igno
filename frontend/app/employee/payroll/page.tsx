"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, CalendarRange, Eye, Filter, ReceiptText, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { getMyPayroll, type PayrollRecord } from "@/lib/api";
import { formatCell, humanize } from "@/lib/formatters";
import { EmployeePayslipModal } from "@/components/employee/employee-payslip-modal";
import {
  EmployeeErrorState,
  EmployeePageIntro,
  EmployeePageLoadingSkeleton,
  EmployeeSection,
  EmployeeStatCard,
  EmployeeTable,
} from "@/components/employee/employee-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

export default function EmployeePayrollPage() {
  const today = useMemo(() => manilaDateInput(new Date()), []);
  const monthStart = useMemo(() => {
    const reference = new Date();
    const local = new Date(reference.getFullYear(), reference.getMonth(), 1);
    return manilaDateInput(local);
  }, []);

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [activePayslip, setActivePayslip] = useState<PayrollRecord | null>(null);

  const payrollQuery = useQuery({
    queryKey: ["employee", "payroll", fromDate, toDate],
    queryFn: () => getMyPayroll({ from: fromDate || undefined, to: toDate || undefined }),
  });

  const rows = useMemo(() => payrollQuery.data || [], [payrollQuery.data]);
  const latest = rows[0];

  const releasedCount = useMemo(
    () => rows.filter((row) => String(row.status || "").toUpperCase() === "RELEASED").length,
    [rows],
  );

  const totalNet = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.netAmountPaid || 0), 0),
    [rows],
  );

  const totalDeductions = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.otherDeduction || 0), 0),
    [rows],
  );

  if (payrollQuery.isLoading) {
    return <EmployeePageLoadingSkeleton />;
  }

  if (payrollQuery.isError) {
    return <EmployeeErrorState message={(payrollQuery.error as Error).message || "Unable to load payroll."} />;
  }

  return (
    <section className="w-full space-y-5">
      <EmployeePageIntro
        title="My Payroll"
        description="Track your payroll coverage, earnings, and deductions for each pay period."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeStatCard
          label="Payroll Records"
          value={String(rows.length)}
          hint="Entries in selected range."
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="Released"
          value={String(releasedCount)}
          hint="Finalized payroll runs."
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
        />
        <EmployeeStatCard
          label="Net Total"
          value={formatCell(totalNet, "currency")}
          hint="Sum of net pay in current filter."
          icon={<Wallet className="h-4 w-4" />}
          tone="brand"
        />
        <EmployeeStatCard
          label="Deductions"
          value={formatCell(totalDeductions, "currency")}
          hint="Aggregate deductions."
          icon={<Filter className="h-4 w-4" />}
          tone={totalDeductions > 0 ? "amber" : "slate"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <EmployeeSection title="Latest Payroll Snapshot" icon={<CalendarRange className="h-4 w-4 text-brand-600" />}>
          {latest ? (
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Coverage</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatCell(latest.payrollFrom, "date")} - {formatCell(latest.payrollTo, "date")}
                </p>
                <p className="mt-1 text-xs text-slate-500">Created {formatCell(latest.payrollDate, "date")}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
                <div className="mt-1">
                  <StatusBadge value={latest.status || "DRAFT"} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Gross</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatCell(latest.totalAmount, "currency")}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Net</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatCell(latest.netAmountPaid, "currency")}</p>
                <Button
                  variant="secondary"
                  className="mt-2 h-8 rounded-md px-2.5 text-xs"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => setActivePayslip(latest)}
                >
                  View Payslip
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-slate-600">No payroll run has been created for this account yet.</div>
          )}
        </EmployeeSection>

        <EmployeeSection title="Payroll History" icon={<ReceiptText className="h-4 w-4 text-brand-600" />} subtitle={`${rows.length} record(s)`}>
          <div className="flex flex-col gap-3 border-b border-line px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">From</span>
              <Input type="date" className="h-10 w-full sm:w-[170px]" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">To</span>
              <Input type="date" className="h-10 w-full sm:w-[170px]" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
            <Button
              variant="ghost"
              className="h-10 px-3"
              onClick={() => {
                setFromDate(monthStart);
                setToDate(today);
              }}
            >
              This month
            </Button>
          </div>

          <EmployeeTable
            columns={[
              {
                key: "coverage",
                label: "Coverage",
                render: (row) => `${formatCell(row.payrollFrom, "date")} - ${formatCell(row.payrollTo, "date")}`,
              },
              { key: "days", label: "Days", render: (row) => String(row.daysOfWork || 0) },
              { key: "rate", label: "Rate", render: (row) => formatCell(row.rate, "currency") },
              { key: "gross", label: "Gross", render: (row) => formatCell(row.totalAmount, "currency") },
              { key: "deductions", label: "Deductions", render: (row) => formatCell(row.otherDeduction, "currency") },
              { key: "net", label: "Net", render: (row) => formatCell(row.netAmountPaid, "currency") },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge value={row.status || "DRAFT"} />,
              },
              {
                key: "payslip",
                label: "Payslip",
                render: (row) => (
                  <Button
                    variant="secondary"
                    className="h-8 rounded-md px-2.5 text-xs"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => setActivePayslip(row as PayrollRecord)}
                  >
                    Preview
                  </Button>
                ),
              },
              {
                key: "created",
                label: "Created",
                hideOnMobile: true,
                render: (row) => formatCell(row.payrollDate, "datetime"),
              },
            ]}
            rows={rows as Array<Record<string, unknown>>}
            emptyLabel="No payroll records found for selected dates."
            renderCardTitle={(row) => `${formatCell(row.payrollFrom, "date")} - ${formatCell(row.payrollTo, "date")}`}
            renderCardMeta={(row) => humanize(String(row.status || "DRAFT"))}
            mobilePriorityKeys={["coverage", "net", "deductions", "status", "payslip"]}
            mobileFieldLimit={5}
          />
        </EmployeeSection>
      </section>

      <EmployeePayslipModal open={Boolean(activePayslip)} payroll={activePayslip} onClose={() => setActivePayslip(null)} />
    </section>
  );
}

function manilaDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}
