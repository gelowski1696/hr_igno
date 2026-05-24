"use client";

import { FileDown, X } from "lucide-react";
import { useState } from "react";

import type { PayrollRecord } from "@/lib/api";
import { formatCell } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export function EmployeePayslipModal({
  open,
  payroll,
  onClose,
}: {
  open: boolean;
  payroll: PayrollRecord | null;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState("");

  if (!open || !payroll) {
    return null;
  }

  const deductions = toNumber(payroll.totalAllowance) + toNumber(payroll.otherDeduction);
  const gross = toNumber(payroll.totalAmount || payroll.totalRegularWage);
  const net = toNumber(payroll.netAmountPaid);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/45 p-3 sm:p-6" onClick={onClose}>
      <section
        className="mx-auto flex h-full w-full max-w-[1080px] flex-col border border-line bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">My Payslip</p>
            <h3 className="font-slab text-2xl font-bold text-ink">
              {formatCell(payroll.payrollFrom, "date")} - {formatCell(payroll.payrollTo, "date")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Issued {formatCell(payroll.payrollDate, "date")} | Days {String(payroll.daysOfWork || 0)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={payroll.status || "DRAFT"} />
            <Button
              className="h-9 rounded-md px-3"
              icon={<FileDown className="h-4 w-4" />}
              onClick={() => void generatePayslipPdf(payroll, setNotice)}
            >
              Generate PDF
            </Button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              aria-label="Close payslip preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {notice ? (
          <div className="border-b border-line bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">{notice}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
          <article className="mx-auto max-w-[880px] border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">VMJAMTECH HR</p>
                <h4 className="mt-1 text-xl font-bold text-ink">Employee Payslip</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {formatCell(payroll.payrollFrom, "date")} - {formatCell(payroll.payrollTo, "date")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Net Salary</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCell(net, "currency")}</p>
              </div>
            </div>

            <div className="grid gap-3 border-b border-line py-4 sm:grid-cols-4">
              <PreviewInfoItem label="Employee" value={employeeName(payroll)} />
              <PreviewInfoItem label="Employee ID" value={payroll.employee?.employeeCode || "-"} />
              <PreviewInfoItem label="Store" value={payroll.employee?.store?.area || payroll.employee?.store?.name || "-"} />
              <PreviewInfoItem label="Status" value={String(payroll.status || "-")} />
            </div>

            <div className="grid gap-4 py-4 lg:grid-cols-2">
              <table className="w-full border border-line text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-line bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.07em] text-slate-600">
                      Earnings
                    </th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.07em] text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <MoneyRow label="Regular Wage" value={toNumber(payroll.totalRegularWage)} />
                  <MoneyRow label="Gross Salary" value={gross} />
                  <MoneyRow label="Rate (per day)" value={toNumber(payroll.rate)} />
                  <MoneyRow label="Total Earnings" value={gross} strong />
                </tbody>
              </table>

              <table className="w-full border border-line text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-line bg-muted px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.07em] text-slate-600">
                      Deductions
                    </th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-right text-xs font-bold uppercase tracking-[0.07em] text-slate-600">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <MoneyRow label="Statutory Deductions" value={toNumber(payroll.totalAllowance)} />
                  <MoneyRow label="Other Deductions" value={toNumber(payroll.otherDeduction)} />
                  <MoneyRow label="Total Deductions" value={deductions} strong />
                  <MoneyRow label="Net Salary" value={net} strong />
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function PreviewInfoItem({ label, value }: { label: string; value: string }) {
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
      <td className={strong ? "border-b border-line px-3 py-2 font-semibold text-ink" : "border-b border-line px-3 py-2 text-slate-700"}>
        {label}
      </td>
      <td className={strong ? "border-b border-line px-3 py-2 text-right font-semibold text-ink" : "border-b border-line px-3 py-2 text-right text-slate-700"}>
        {formatCell(value, "currency")}
      </td>
    </tr>
  );
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function employeeName(payroll: PayrollRecord) {
  const firstName = payroll.employee?.firstName || "";
  const lastName = payroll.employee?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "-";
}

async function generatePayslipPdf(payroll: PayrollRecord, setNotice: (value: string) => void) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const right = pageWidth - margin;

    const gross = toNumber(payroll.totalAmount || payroll.totalRegularWage);
    const deduction = toNumber(payroll.totalAllowance) + toNumber(payroll.otherDeduction);
    const net = toNumber(payroll.netAmountPaid);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(11);
    doc.text("VMJAMTECH HR", margin, 44);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(22);
    doc.text("Employee Payslip", margin, 68);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `${formatCell(payroll.payrollFrom, "date")} - ${formatCell(payroll.payrollTo, "date")}`,
      margin,
      86,
    );

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Employee: ${employeeName(payroll)}`, margin, 118);
    doc.text(`Employee ID: ${payroll.employee?.employeeCode || "-"}`, margin, 134);
    doc.text(`Store: ${payroll.employee?.store?.area || payroll.employee?.store?.name || "-"}`, margin, 150);

    doc.text(`Issued: ${formatCell(payroll.payrollDate, "date")}`, right, 118, { align: "right" });
    doc.text(`Status: ${String(payroll.status || "-")}`, right, 134, { align: "right" });
    doc.text(`Days Worked: ${String(payroll.daysOfWork || 0)}`, right, 150, { align: "right" });

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 168, right, 168);

    drawPdfAmountLine(doc, "Gross Salary", formatPdfMoney(gross), margin, 196, right);
    drawPdfAmountLine(doc, "Total Deductions", formatPdfMoney(deduction), margin, 220, right);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, 236, right, 236);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(4, 120, 87);
    doc.text("Net Salary", margin, 266);
    doc.setFontSize(22);
    doc.text(formatPdfMoney(net), right, 270, { align: "right" });

    const suffix = String(payroll.payrollTo || payroll.payrollFrom || payroll.payrollDate || "payslip").replace(/[^0-9-]/g, "");
    const filename = `My-Payslip-${payroll.employee?.employeeCode || payroll.id}-${suffix}.pdf`;
    doc.save(filename);
    setNotice("PDF generated.");
  } catch {
    setNotice("Unable to generate PDF.");
  }
}

function drawPdfAmountLine(
  doc: {
    setFont: (fontName: string, fontStyle: string) => void;
    setFontSize: (size: number) => void;
    setTextColor: (...args: number[]) => void;
    text: (text: string, x: number, y: number, options?: { align?: "left" | "center" | "right" }) => void;
  },
  label: string,
  value: string,
  leftX: number,
  y: number,
  rightX: number,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(label, leftX, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(value, rightX, y, { align: "right" });
}

function formatPdfMoney(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `PHP ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
