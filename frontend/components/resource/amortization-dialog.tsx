"use client";

import { CheckCircle2, Clock3, CreditCard, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/formatters";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ApiRecord } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type InstallmentRow = {
  index: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paidDate?: string;
  status: "PAID" | "PARTIAL" | "UNPAID";
};

type PaymentRecord = {
  amountPaid: number;
  paymentDate?: string;
};

type PaymentTimelineEntry = {
  id: string;
  amountPaid: number;
  paymentMethod?: string;
  paymentDate?: string;
  createdAt?: string;
  status?: string;
  recordedBy?: string;
};

type Props = {
  open: boolean;
  record: ApiRecord | null;
  endpoint: string;
  onClose: () => void;
  onPaid: () => void;
};

type ConfirmState = {
  row: InstallmentRow;
  amountToPay: number;
} | null;

export function AmortizationDialog({ open, record, endpoint, onClose, onPaid }: Props) {
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentTimelineEntry[]>([]);

  const recordId = Number(record?.id);
  const installmentPlan = safePlan(record?.installmentPlan);
  const totalAmount = toNumber(record?.totalAmount ?? record?.amount);
  const interests = toNumber(record?.interests);
  const principal = Math.max(0, round2(totalAmount - interests));
  const startDate = resolveStartDate(record);
  const monthlyAmount = installmentPlan > 0 ? round2(totalAmount / installmentPlan) : 0;
  const fallbackRecorder = typeof record?.encoder === "string" ? record.encoder : "System";

  const fallbackHistory = useMemo(
    () => normalizePaymentHistory(record?.payments, fallbackRecorder),
    [fallbackRecorder, record?.payments],
  );

  const installmentPayments = useMemo<PaymentRecord[]>(
    () =>
      paymentHistory.map((entry) => ({
        amountPaid: entry.amountPaid,
        paymentDate: entry.paymentDate || entry.createdAt,
      })),
    [paymentHistory],
  );

  const installments = useMemo(
    () => buildInstallments({ startDate, plan: installmentPlan, totalAmount, payments: installmentPayments }),
    [installmentPayments, installmentPlan, startDate, totalAmount],
  );

  const nextDue = installments.find((row) => row.status !== "PAID");

  const loadPaymentHistory = useCallback(async () => {
    if (!Number.isFinite(recordId) || recordId <= 0) {
      setPaymentHistory(fallbackHistory);
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError("");
    try {
      const result = await apiFetch<unknown>(`${endpoint}/${recordId}/payments`);
      const normalized = normalizePaymentHistory(result, fallbackRecorder);
      setPaymentHistory(normalized.length ? normalized : fallbackHistory);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load payment history.";
      setHistoryError(message);
      toastError(message);
      setPaymentHistory(fallbackHistory);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [endpoint, fallbackHistory, fallbackRecorder, recordId]);

  useEffect(() => {
    if (!open) return;
    setPaymentHistory(fallbackHistory);
    setHistoryError("");
    void loadPaymentHistory();
  }, [fallbackHistory, loadPaymentHistory, open]);

  if (!open || !record) return null;
  const activeRecord = record;

  async function handleConfirmPay() {
    if (!confirm) return;
    if (!Number.isFinite(recordId) || recordId <= 0) return;

    setIsPaying(true);
    setErrorText("");
    try {
      await apiFetch(`${endpoint}/${recordId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountPaid: confirm.amountToPay,
          paymentMethod: String(activeRecord.paymentMethod || "Cash"),
          type: String(activeRecord.type || "Loan"),
        }),
      });
      setConfirm(null);
      await loadPaymentHistory();
      onPaid();
      toastSuccess("Payment recorded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to record payment.";
      setErrorText(message);
      toastError(message);
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/35">
      <div className="ml-auto flex h-full w-full max-w-[1480px] flex-col border-l-[1.5px] border-line bg-field shadow-overlay">
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-600">Loan Plan</p>
            <h2 className="text-2xl font-bold text-ink">Amortization</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close amortization"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Summary label="Principal" value={formatMoney(principal)} />
            <Summary label="Interest" value={formatMoney(interests)} />
            <Summary label="Total" value={formatMoney(totalAmount)} />
            <Summary label="Installments" value={String(installmentPlan)} />
            <Summary label="Monthly" value={formatMoney(monthlyAmount)} />
            <Summary label="Next Due" value={nextDue ? formatDate(nextDue.dueDate, "MMM d, yyyy") : "Settled"} />
          </div>

          {errorText ? (
            <div className="mt-3 border-l-[4px] border-signal-red bg-red-50 px-3 py-2 text-sm text-signal-red">
              {errorText}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden border border-line bg-white">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="w-[5%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">#</th>
                    <th className="w-[16%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Due Date</th>
                    <th className="w-[14%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Installment</th>
                    <th className="w-[14%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Paid</th>
                    <th className="w-[14%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Remaining</th>
                    <th className="w-[11%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Status</th>
                    <th className="w-[13%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Paid Date</th>
                    <th className="w-[13%] border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((row) => {
                    const canPay = row.status !== "PAID" && row.remainingAmount > 0;
                    return (
                      <tr key={`${row.index}-${row.dueDate}`} className="hover:bg-slate-50/70">
                        <td className="border-b border-line px-3 py-2 align-top">{row.index}</td>
                        <td className="border-b border-line px-3 py-2 align-top">
                          <span className="block truncate" title={formatDate(row.dueDate, "MMM d, yyyy")}>
                            {formatDate(row.dueDate, "MMM d, yyyy")}
                          </span>
                        </td>
                        <td className="border-b border-line px-3 py-2 align-top">{formatMoney(row.amount)}</td>
                        <td className="border-b border-line px-3 py-2 align-top">{formatMoney(row.paidAmount)}</td>
                        <td className="border-b border-line px-3 py-2 align-top">{formatMoney(row.remainingAmount)}</td>
                        <td className="border-b border-line px-3 py-2 align-top">
                          <StatusBadge value={row.status} />
                        </td>
                        <td className="border-b border-line px-3 py-2 align-top">
                          {row.paidDate ? formatDate(row.paidDate, "MMM d, yyyy") : "-"}
                        </td>
                        <td className="border-b border-line px-3 py-2 align-top">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canPay || isPaying}
                            onClick={() => setConfirm({ row, amountToPay: row.remainingAmount })}
                          >
                            {row.status === "PAID" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                            {row.status === "PAID" ? "Settled" : "Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border border-line bg-white">
              <div className="border-b border-line px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Payment Timeline</p>
              </div>
              <div className="max-h-[520px] overflow-y-auto px-3 py-3">
                {isLoadingHistory ? (
                  <p className="py-3 text-sm text-slate-500">Loading payment history...</p>
                ) : null}
                {!isLoadingHistory && historyError ? (
                  <p className="py-2 text-sm text-signal-red">{historyError}</p>
                ) : null}
                {!isLoadingHistory && paymentHistory.length === 0 ? (
                  <p className="py-3 text-sm text-slate-500">No payments yet.</p>
                ) : null}

                <div className="space-y-3">
                  {paymentHistory.map((entry) => (
                    <div key={entry.id} className="border border-line/80 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{formatMoney(entry.amountPaid)}</p>
                        <TimelineStateBadge value={resolveTimelineState(entry.status)} />
                      </div>
                      <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                        <p className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(entry.paymentDate || entry.createdAt || "", "MMM d, yyyy h:mm a")}
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" />
                          {entry.paymentMethod || "Method not set"}
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          {entry.recordedBy || fallbackRecorder || "System"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Record installment payment?"
        description={
          confirm
            ? `This will post a payment of ${formatMoney(confirm.amountToPay)} for installment #${confirm.row.index}.`
            : ""
        }
        confirmLabel="Record Payment"
        isConfirming={isPaying}
        onCancel={() => {
          if (isPaying) return;
          setConfirm(null);
        }}
        onConfirm={handleConfirmPay}
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

type TimelineState = "RECORDED" | "PARTIAL" | "CANCELLED";

function TimelineStateBadge({ value }: { value: TimelineState }) {
  if (value === "PARTIAL") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        Partial
      </span>
    );
  }

  if (value === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      Recorded
    </span>
  );
}

function resolveTimelineState(value?: string): TimelineState {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (normalized === "CANCELLED") {
    return "CANCELLED";
  }
  if (normalized === "PARTIAL") {
    return "PARTIAL";
  }
  return "RECORDED";
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function safePlan(value: unknown) {
  const plan = Math.trunc(toNumber(value));
  return plan > 0 ? plan : 1;
}

function resolveStartDate(record: ApiRecord | null) {
  const candidate = record?.dateIssued ?? record?.date_issued ?? record?.createdAt;
  if (typeof candidate !== "string") {
    return new Date();
  }
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizePaymentHistory(raw: unknown, fallbackRecorder?: string): PaymentTimelineEntry[] {
  if (!Array.isArray(raw)) return [];

  const rows: PaymentTimelineEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const payment = entry as Record<string, unknown>;
    const amountPaid = toNumber(payment.amountPaid ?? payment.amount_paid);
    if (amountPaid <= 0) continue;

    const idValue = payment.id ?? payment.payment_id ?? `local-${rows.length + 1}`;
    const paymentDate =
      typeof payment.paymentDate === "string"
        ? payment.paymentDate
        : typeof payment.payment_date === "string"
          ? payment.payment_date
          : undefined;

    rows.push({
      id: String(idValue),
      amountPaid,
      paymentMethod:
        typeof payment.paymentMethod === "string"
          ? payment.paymentMethod
          : typeof payment.payment_method === "string"
            ? payment.payment_method
            : undefined,
      paymentDate,
      createdAt: typeof payment.createdAt === "string" ? payment.createdAt : undefined,
      status: typeof payment.status === "string" ? payment.status : undefined,
      recordedBy:
        typeof payment.recordedBy === "string"
          ? payment.recordedBy
          : typeof payment.recorded_by === "string"
            ? payment.recorded_by
            : fallbackRecorder,
    });
  }

  return rows.sort((a, b) => {
    const at = resolveTime(a);
    const bt = resolveTime(b);
    return bt - at;
  });
}

function resolveTime(entry: PaymentTimelineEntry) {
  const reference = entry.paymentDate || entry.createdAt;
  if (!reference) return 0;
  const parsed = new Date(reference);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildInstallments(params: {
  startDate: Date;
  plan: number;
  totalAmount: number;
  payments: PaymentRecord[];
}) {
  const { startDate, plan, totalAmount, payments } = params;
  const normalizedPlan = Math.max(1, plan);
  const total = Math.max(0, round2(totalAmount));

  const baseAmount = round2(total / normalizedPlan);
  const rows: InstallmentRow[] = [];

  const amountPerInstallment = Array.from({ length: normalizedPlan }, (_, index) =>
    index === normalizedPlan - 1 ? round2(total - baseAmount * (normalizedPlan - 1)) : baseAmount,
  );

  const paymentPool = [...payments]
    .map((payment) => ({ ...payment }))
    .sort((a, b) => {
      const at = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
      const bt = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
      return at - bt;
    });
  let pointer = 0;

  for (let i = 0; i < normalizedPlan; i += 1) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const installmentAmount = amountPerInstallment[i] || 0;
    let paidAmount = 0;
    let paidDate = "";

    while (pointer < paymentPool.length && paidAmount < installmentAmount - 0.0001) {
      const current = paymentPool[pointer];
      const available = round2(current.amountPaid);
      if (available <= 0) {
        pointer += 1;
        continue;
      }

      const need = round2(installmentAmount - paidAmount);
      const consume = Math.min(available, need);
      paidAmount = round2(paidAmount + consume);
      current.amountPaid = round2(available - consume);
      paidDate = current.paymentDate || paidDate;

      if (current.amountPaid <= 0.0001) {
        pointer += 1;
      }
    }

    const remainingAmount = Math.max(0, round2(installmentAmount - paidAmount));
    const status: InstallmentRow["status"] =
      remainingAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

    rows.push({
      index: i + 1,
      dueDate: dueDate.toISOString(),
      amount: installmentAmount,
      paidAmount,
      remainingAmount,
      paidDate: paidDate || undefined,
      status,
    });
  }

  return rows;
}
