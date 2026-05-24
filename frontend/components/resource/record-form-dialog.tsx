"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, Loader2, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { clsx } from "clsx";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { ApiRecord, ResourceField } from "@/lib/types";

export type AssignmentEmployeeOption = {
  id: number;
  label: string;
};

export type AssignmentEmployeeGroup = {
  id: string;
  name: string;
  memberIds: number[];
};

export type EmployeeAssignmentConfig = {
  enabled: boolean;
  employees: AssignmentEmployeeOption[];
  groups: AssignmentEmployeeGroup[];
};

export type EmployeeSelectGroup = {
  id: string;
  name: string;
  memberIds: number[];
};

export type EmployeeStoreLink = {
  employeeId: number;
  storeId: number | null;
};

type FormVariant = "default" | "leave-request" | "leave-balance" | "user-account" | "cash-advance" | "payroll-run";

type Props = {
  open: boolean;
  mode?: "create" | "edit";
  title: string;
  fields: ResourceField[];
  formVariant?: FormVariant;
  initialValues?: ApiRecord | null;
  isSubmitting: boolean;
  isDeleting?: boolean;
  panelClassName?: string;
  employeeAssignment?: EmployeeAssignmentConfig;
  employeeSelectGroups?: EmployeeSelectGroup[];
  employeeStoreLinks?: EmployeeStoreLink[];
  onClose: () => void;
  onSubmit: (payload: ApiRecord) => Promise<void>;
  onDelete?: () => Promise<void>;
};

type FormValues = Record<string, string>;

type PayrollPreviewRecord = {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  position?: string | null;
  storeArea?: string | null;
  totalDaysWorked: number;
  totalNoTimeOut: number;
  totalHoursWorked: string;
  totalOvertime: string;
  totalUndertime: string;
  totalLateHours: string;
  totalLeaveRate: number;
  totalCashAdvance: number;
  totalLoans: number;
  totalSssLoan: number;
  totalPagibigLoan: number;
  totalPhilhealthLoan: number;
  hoursWorked?: Array<{ date: string; hours: string }>;
  leaves?: Array<{ date: string; leaveType: string; leaveRate: number }>;
  overtime?: Array<{ date: string; overtime: string }>;
  undertime?: Array<{ date: string; undertime: string }>;
  lateHours?: Array<{ date: string; late: string }>;
  noTimeoutHours?: Array<{ date: string; hours: string; timeRecordId: number }>;
  cashadvance?: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number }>;
  loan?: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }>;
  sssloan?: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }>;
  pagibigloan?: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }>;
  philhealthloan?: Array<{ type: string; date: string; atd: string; amount: number; cashAdvanceId: number; installmentPlan: number }>;
  suggestions: {
    daysOfWork: number;
    rate: number;
    totalRegularWage: number;
    overtimeHours: number;
    lateHours: number;
    overtimeAmount: number;
    lateAmount: number;
    addOnHoliday: number;
    sssDeduction: number;
    philhealthDeduction: number;
    pagibigDeduction: number;
    valeDeduction: number;
    loanDeduction: number;
    sssLoan: number;
    pagibigLoan: number;
    philhealthLoan: number;
    totalAllowance: number;
    otherDeduction: number;
    totalAmount: number;
    netAmountPaid: number;
  };
};

export function RecordFormDialog({
  open,
  mode = "create",
  title,
  fields,
  formVariant = "default",
  initialValues = null,
  isSubmitting,
  isDeleting = false,
  panelClassName,
  employeeAssignment,
  employeeSelectGroups,
  employeeStoreLinks,
  onClose,
  onSubmit,
  onDelete
}: Props) {
  const isLeaveRequestVariant = formVariant === "leave-request";
  const isLeaveBalanceVariant = formVariant === "leave-balance";
  const isUserAccountVariant = formVariant === "user-account";
  const isPayrollRunVariant = formVariant === "payroll-run";
  const isEnhancedLeaveVariant = isLeaveRequestVariant || isLeaveBalanceVariant;
  const effectiveFields = useMemo(() => {
    if (isUserAccountVariant && mode === "edit") {
      return fields.map((field) =>
        field.name === "password"
          ? { ...field, required: false, label: "New password" }
          : field
      );
    }
    if (isLeaveBalanceVariant && mode === "create") {
      return fields.filter((field) => field.name !== "vacationUsed" && field.name !== "sickUsed");
    }
    return fields;
  }, [fields, isLeaveBalanceVariant, isUserAccountVariant, mode]);
  const schema = useMemo(() => buildSchema(effectiveFields), [effectiveFields]);
  const formId = useMemo(() => `record-form-${mode}`, [mode]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: buildDefaultValues(effectiveFields)
  });
  const previousEmployeeSelectionRef = useRef("");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const leaveStatus = form.watch("status");
  const selectedEmployeeId = form.watch("employeeId");
  const selectedStoreId = form.watch("storeId");
  const vacationTotal = form.watch("vacationTotal");
  const vacationUsed = form.watch("vacationUsed");
  const sickTotal = form.watch("sickTotal");
  const sickUsed = form.watch("sickUsed");
  const payrollFrom = form.watch("payrollFrom");
  const payrollTo = form.watch("payrollTo");
  const payrollDaysOfWork = form.watch("daysOfWork");
  const payrollRate = form.watch("rate");
  const payrollTotalRegularWage = form.watch("totalRegularWage");
  const payrollOvertimeAmount = form.watch("overtimeAmount");
  const payrollLateAmount = form.watch("lateAmount");
  const payrollAddOnHoliday = form.watch("addOnHoliday");
  const payrollAllowance = form.watch("allowance");
  const payrollBonusRate = form.watch("bonusRate");
  const payrollPenaltyRate = form.watch("penaltyRate");
  const payrollPenaltyOrUndertime = form.watch("penaltyOrUndertime");
  const payrollPondo = form.watch("pondo");
  const payrollSssDeduction = form.watch("sssDeduction");
  const payrollPhilhealthDeduction = form.watch("philhealthDeduction");
  const payrollPagibigDeduction = form.watch("pagibigDeduction");
  const payrollValeDeduction = form.watch("valeDeduction");
  const payrollLoanDeduction = form.watch("loanDeduction");
  const payrollSssLoan = form.watch("sssLoan");
  const payrollPagibigLoan = form.watch("pagibigLoan");
  const payrollPhilhealthLoan = form.watch("philhealthLoan");
  const payrollCharge = form.watch("charge");
  const payrollCredit = form.watch("credit");
  const employeeStoreLookup = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const link of employeeStoreLinks || []) {
      map.set(link.employeeId, link.storeId);
    }
    return map;
  }, [employeeStoreLinks]);
  const durationPreview = useMemo(() => computeInclusiveDays(startDate, endDate), [endDate, startDate]);
  const vacationRemaining = useMemo(() => computeRemainingLeaves(vacationTotal, vacationUsed), [vacationTotal, vacationUsed]);
  const sickRemaining = useMemo(() => computeRemainingLeaves(sickTotal, sickUsed), [sickTotal, sickUsed]);
  const totalRemaining = useMemo(() => {
    const vl = vacationRemaining ?? 0;
    const sl = sickRemaining ?? 0;
    return vl + sl;
  }, [sickRemaining, vacationRemaining]);
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreviewRecord | null>(null);
  const [isLoadingPayrollPreview, setIsLoadingPayrollPreview] = useState(false);
  const [payrollPreviewError, setPayrollPreviewError] = useState("");
  const [isPayrollSummaryOpen, setIsPayrollSummaryOpen] = useState(false);
  const payrollAutoPreviewKeyRef = useRef("");
  const canRequestPayrollSummary = useMemo(() => {
    const employeeId = Number(selectedEmployeeId);
    return Boolean(Number.isInteger(employeeId) && employeeId > 0 && payrollFrom && payrollTo);
  }, [payrollFrom, payrollTo, selectedEmployeeId]);

  const payrollFieldNames = useMemo(() => new Set(effectiveFields.map((field) => field.name)), [effectiveFields]);

  const setPayrollValueIfChanged = useCallback((fieldName: string, value: number, shouldDirty = false) => {
    if (!payrollFieldNames.has(fieldName)) return;
    const next = formatNumberForForm(value);
    const current = String(form.getValues(fieldName) ?? "");
    if (current === next) return;
    form.setValue(fieldName, next, {
      shouldDirty,
      shouldValidate: false,
    });
  }, [form, payrollFieldNames]);

  const applyPreviewToPayrollForm = useCallback((summary: PayrollPreviewRecord) => {
    const suggestions = summary.suggestions || ({} as PayrollPreviewRecord["suggestions"]);
    setPayrollValueIfChanged("daysOfWork", suggestions.daysOfWork ?? summary.totalDaysWorked ?? 0);
    setPayrollValueIfChanged("rate", suggestions.rate ?? 0);
    setPayrollValueIfChanged("totalRegularWage", suggestions.totalRegularWage ?? 0);
    setPayrollValueIfChanged("overtimeHours", suggestions.overtimeHours ?? 0);
    setPayrollValueIfChanged("lateHours", suggestions.lateHours ?? 0);
    setPayrollValueIfChanged("addOnHoliday", suggestions.addOnHoliday ?? summary.totalLeaveRate ?? 0);
    setPayrollValueIfChanged("sssDeduction", suggestions.sssDeduction ?? 0);
    setPayrollValueIfChanged("philhealthDeduction", suggestions.philhealthDeduction ?? 0);
    setPayrollValueIfChanged("pagibigDeduction", suggestions.pagibigDeduction ?? 0);
    setPayrollValueIfChanged("valeDeduction", suggestions.valeDeduction ?? summary.totalCashAdvance ?? 0);
    setPayrollValueIfChanged("loanDeduction", suggestions.loanDeduction ?? summary.totalLoans ?? 0);
    setPayrollValueIfChanged("sssLoan", suggestions.sssLoan ?? summary.totalSssLoan ?? 0);
    setPayrollValueIfChanged("pagibigLoan", suggestions.pagibigLoan ?? summary.totalPagibigLoan ?? 0);
    setPayrollValueIfChanged("philhealthLoan", suggestions.philhealthLoan ?? summary.totalPhilhealthLoan ?? 0);
    setPayrollValueIfChanged("totalAllowance", suggestions.totalAllowance ?? 0);
    setPayrollValueIfChanged("otherDeduction", suggestions.otherDeduction ?? 0);
    setPayrollValueIfChanged("totalAmount", suggestions.totalAmount ?? 0);
    setPayrollValueIfChanged("netAmountPaid", suggestions.netAmountPaid ?? 0);
  }, [setPayrollValueIfChanged]);

  const fetchPayrollPreview = useCallback(async (employeeId: number, from: string, to: string) => {
    const previewRows = await apiFetch<PayrollPreviewRecord[]>("payroll/preview", {
      method: "POST",
      body: JSON.stringify({
        startDate: from,
        endDate: to,
        employeeId,
        employeeIds: [employeeId],
        employee_ids: [employeeId],
      }),
    });

    let summary = Array.isArray(previewRows) ? previewRows[0] : null;
    if (!summary) {
      const fallbackRows = await apiFetch<PayrollPreviewRecord[]>("payroll/generate", {
        method: "POST",
        body: JSON.stringify({
          startDate: from,
          endDate: to,
          employeeId,
          employeeIds: [employeeId],
          employee_ids: [employeeId],
        }),
      });
      summary = Array.isArray(fallbackRows) ? fallbackRows[0] : null;
    }

    return summary;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(mode === "edit" ? buildInitialValues(effectiveFields, initialValues) : buildDefaultValues(effectiveFields));
  }, [effectiveFields, form, initialValues, mode, open]);

  useEffect(() => {
    if (open) return;
    setPayrollPreview(null);
    setPayrollPreviewError("");
    setIsLoadingPayrollPreview(false);
    setIsPayrollSummaryOpen(false);
    payrollAutoPreviewKeyRef.current = "";
  }, [open]);

  useEffect(() => {
    if (!open || !isUserAccountVariant) return;
    previousEmployeeSelectionRef.current = mode === "edit" ? form.getValues("employeeId") || "" : "";
  }, [form, isUserAccountVariant, mode, open, initialValues]);

  useEffect(() => {
    if (!open || !isUserAccountVariant) return;
    const employeeValue = selectedEmployeeId || "";
    if (!employeeValue) {
      previousEmployeeSelectionRef.current = "";
      return;
    }
    if (previousEmployeeSelectionRef.current === employeeValue) {
      return;
    }
    previousEmployeeSelectionRef.current = employeeValue;

    const employeeId = Number(employeeValue);
    if (!Number.isInteger(employeeId) || employeeId <= 0) return;

    const mappedStoreId = employeeStoreLookup.get(employeeId);
    if (!mappedStoreId || mappedStoreId <= 0) return;

    const nextStore = String(mappedStoreId);
    if ((selectedStoreId || "") === nextStore) {
      return;
    }

    form.setValue("storeId", nextStore, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    employeeStoreLookup,
    form,
    isUserAccountVariant,
    open,
    selectedEmployeeId,
    selectedStoreId,
  ]);

  useEffect(() => {
    if (!open || !isPayrollRunVariant || mode !== "create") return;
    if (!canRequestPayrollSummary) {
      payrollAutoPreviewKeyRef.current = "";
      return;
    }

    const employeeId = Number(selectedEmployeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !payrollFrom || !payrollTo) return;

    const previewKey = `${employeeId}:${payrollFrom}:${payrollTo}`;
    if (payrollAutoPreviewKeyRef.current === previewKey) return;

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoadingPayrollPreview(true);
      setPayrollPreviewError("");
      try {
        const summary = await fetchPayrollPreview(employeeId, payrollFrom, payrollTo);
        if (!active) return;

        if (!summary) {
          setPayrollPreview(null);
          setPayrollPreviewError("No payroll summary found for the selected employee and period.");
          return;
        }

        payrollAutoPreviewKeyRef.current = previewKey;
        setPayrollPreview(summary);
        applyPreviewToPayrollForm(summary);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Unable to load payroll summary.";
        setPayrollPreview(null);
        setPayrollPreviewError(message);
      } finally {
        if (active) {
          setIsLoadingPayrollPreview(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    applyPreviewToPayrollForm,
    canRequestPayrollSummary,
    fetchPayrollPreview,
    isPayrollRunVariant,
    mode,
    open,
    payrollFrom,
    payrollTo,
    selectedEmployeeId,
  ]);

  useEffect(() => {
    if (!open || !isPayrollRunVariant) return;

    const daysOfWork = toNumber(payrollDaysOfWork);
    const rate = toNumber(payrollRate);
    const totalRegularWageInput = toNumber(payrollTotalRegularWage);
    const totalRegularWage = totalRegularWageInput > 0 ? totalRegularWageInput : round2(daysOfWork * rate);
    const overtimeAmount = toNumber(payrollOvertimeAmount);
    const lateAmount = toNumber(payrollLateAmount);
    const addOnHoliday = toNumber(payrollAddOnHoliday);
    const allowance = toNumber(payrollAllowance);
    const bonusRate = toNumber(payrollBonusRate);
    const penaltyRate = toNumber(payrollPenaltyRate);
    const penaltyOrUndertime = toNumber(payrollPenaltyOrUndertime);
    const pondo = toNumber(payrollPondo);
    const sssDeduction = toNumber(payrollSssDeduction);
    const philhealthDeduction = toNumber(payrollPhilhealthDeduction);
    const pagibigDeduction = toNumber(payrollPagibigDeduction);
    const valeDeduction = toNumber(payrollValeDeduction);
    const loanDeduction = toNumber(payrollLoanDeduction);
    const sssLoan = toNumber(payrollSssLoan);
    const pagibigLoan = toNumber(payrollPagibigLoan);
    const philhealthLoan = toNumber(payrollPhilhealthLoan);
    const charge = toNumber(payrollCharge);
    const credit = toNumber(payrollCredit);

    const totalAllowance = round2(sssDeduction + philhealthDeduction + pagibigDeduction);
    const otherDeduction = round2(
      penaltyRate +
        pondo +
        penaltyOrUndertime +
        lateAmount +
        sssLoan +
        pagibigLoan +
        philhealthLoan +
        valeDeduction +
        loanDeduction
    );
    const totalAmount = round2(totalRegularWage + overtimeAmount + addOnHoliday + bonusRate + allowance);
    const netAmountPaid = round2(totalAmount + credit - (totalAllowance + otherDeduction + charge));

    setPayrollValueIfChanged("totalRegularWage", totalRegularWage);
    setPayrollValueIfChanged("totalAllowance", totalAllowance);
    setPayrollValueIfChanged("otherDeduction", otherDeduction);
    setPayrollValueIfChanged("totalAmount", totalAmount);
    setPayrollValueIfChanged("netAmountPaid", netAmountPaid);
  }, [
    isPayrollRunVariant,
    open,
    payrollAddOnHoliday,
    payrollAllowance,
    payrollBonusRate,
    payrollCharge,
    payrollCredit,
    payrollDaysOfWork,
    payrollLateAmount,
    payrollLoanDeduction,
    payrollOvertimeAmount,
    payrollPagibigDeduction,
    payrollPagibigLoan,
    payrollPenaltyOrUndertime,
    payrollPenaltyRate,
    payrollPhilhealthDeduction,
    payrollPhilhealthLoan,
    payrollPondo,
    payrollRate,
    payrollSssDeduction,
    payrollSssLoan,
    payrollTotalRegularWage,
    payrollValeDeduction,
    setPayrollValueIfChanged,
  ]);

  if (!open) {
    return null;
  }

  async function submit(values: FormValues) {
    await onSubmit(normalizePayload(values, effectiveFields));
    form.reset();
  }

  async function openPayrollSummaryModal() {
    if (!isPayrollRunVariant) return;

    setIsPayrollSummaryOpen(true);
    setPayrollPreviewError("");

    const employeeId = Number(selectedEmployeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0 || !payrollFrom || !payrollTo) {
      setPayrollPreview(null);
      setPayrollPreviewError("Select employee, start date, and end date first.");
      return;
    }

    setIsLoadingPayrollPreview(true);
    try {
      const summary = await fetchPayrollPreview(employeeId, payrollFrom, payrollTo);

      if (!summary) {
        setPayrollPreview(null);
        setPayrollPreviewError("No payroll summary found for the selected employee and period.");
        return;
      }

      payrollAutoPreviewKeyRef.current = `${employeeId}:${payrollFrom}:${payrollTo}`;
      setPayrollPreview(summary);
      applyPreviewToPayrollForm(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load payroll summary.";
      setPayrollPreview(null);
      setPayrollPreviewError(message);
    } finally {
      setIsLoadingPayrollPreview(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30">
      <div
        className={clsx(
          "ml-auto flex h-full w-full max-w-[470px] flex-col border-l-[1.5px] border-line bg-field shadow-overlay",
          panelClassName
        )}
      >
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-2.5">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close form"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Button type="submit" form={formId} className="h-8 rounded-md px-3 text-xs" disabled={isSubmitting || isDeleting}>
            {isSubmitting ? "Saving" : "Save changes"}
          </Button>
        </div>
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-3 sm:px-5">
          <h2 className="text-[24px] font-bold leading-7 text-ink sm:text-[28px] sm:leading-8">{title}</h2>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Dismiss form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form id={formId} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5" onSubmit={form.handleSubmit(submit)}>
          {isLeaveRequestVariant ? (
            <div className="mb-4 grid grid-cols-1 gap-2 rounded-md border border-line bg-white p-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-ink">{humanizeStatus(leaveStatus || "PENDING")}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Duration</p>
                <p className="mt-1 text-sm font-semibold text-ink">{durationPreview ? `${durationPreview} day(s)` : "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Coverage</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatCoverage(startDate, endDate)}</p>
              </div>
            </div>
          ) : null}

          {isLeaveBalanceVariant ? (
            <div className="mb-4 space-y-2 rounded-md border border-line bg-white p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">VL Remaining</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{formatLeaveCount(vacationRemaining)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">SL Remaining</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{formatLeaveCount(sickRemaining)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Total Leave Pool</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{formatLeaveCount(totalRemaining)}</p>
                </div>
              </div>
              {mode === "create" ? (
                <p className="text-xs text-slate-500">
                  Used balances start at zero for new records and are updated automatically from approved leave requests.
                </p>
              ) : null}
            </div>
          ) : null}

          {isPayrollRunVariant ? (
            <div className="mb-4 rounded-md border border-line bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Payroll Summary</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Review attendance, leaves, and loan balances before saving this payroll.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 rounded-md px-3 text-xs sm:w-auto"
                  icon={isLoadingPayrollPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  onClick={openPayrollSummaryModal}
                  disabled={isLoadingPayrollPreview || !canRequestPayrollSummary}
                >
                  {isLoadingPayrollPreview ? "Loading summary" : "View summary"}
                </Button>
              </div>
              {!canRequestPayrollSummary ? (
                <p className="mt-2 text-xs text-slate-500">Select employee, start date, and end date to view summary.</p>
              ) : null}
              {payrollPreviewError ? <p className="mt-2 text-xs text-signal-red">! {payrollPreviewError}</p> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            {effectiveFields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                form={form}
                className={fieldSpanClass(field, formVariant)}
                formVariant={formVariant}
                employeeAssignment={employeeAssignment}
                employeeSelectGroups={employeeSelectGroups}
              />
            ))}
          </div>

          {mode === "edit" && onDelete ? (
            <div className="mt-7 border-t border-line pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Danger zone</p>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                Deleting this record is permanent and can affect linked data.
              </p>
              <Button
                variant="danger"
                className="mt-3 h-8 rounded-md px-3 text-xs"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onDelete()}
                disabled={isDeleting || isSubmitting}
              >
                {isDeleting ? "Deleting" : "Delete record"}
              </Button>
            </div>
          ) : null}

        </form>

        {isPayrollRunVariant && isPayrollSummaryOpen ? (
          <PayrollSummaryModal
            loading={isLoadingPayrollPreview}
            error={payrollPreviewError}
            summary={payrollPreview}
            onClose={() => setIsPayrollSummaryOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

function PayrollSummaryModal({
  loading,
  error,
  summary,
  onClose,
}: {
  loading: boolean;
  error: string;
  summary: PayrollPreviewRecord | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/45 p-3 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-md border border-line bg-white shadow-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Payroll summary"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Payroll</p>
            <h3 className="text-lg font-bold text-ink">Summary</h3>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close summary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payroll summary
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-signal-red">! {error}</div>
          ) : !summary ? (
            <div className="rounded-md border border-line bg-muted px-3 py-3 text-sm text-slate-600">No summary data available.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-line bg-white px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {summary.employeeCode} - {summary.fullName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {summary.position || "No position"}{summary.storeArea ? ` - ${summary.storeArea}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric label="Total Days Worked" value={String(summary.totalDaysWorked || 0)} />
                <SummaryMetric label="Total Days No Time-Out" value={String(summary.totalNoTimeOut || 0)} />
                <SummaryMetric label="Total Hours Worked" value={summary.totalHoursWorked || "00:00"} />
                <SummaryMetric label="Total Leave Rate" value={formatMoney(summary.totalLeaveRate)} />
                <SummaryMetric label="Total Overtime Hours" value={summary.totalOvertime || "00:00"} />
                <SummaryMetric label="Total Late Hours" value={summary.totalLateHours || "00:00"} />
                <SummaryMetric label="Total Undertime Hours" value={summary.totalUndertime || "00:00"} />
                <SummaryMetric label="Salary Rate" value={formatMoney(summary.suggestions?.rate)} />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric label="Cash Advance Balance" value={formatMoney(summary.totalCashAdvance)} />
                <SummaryMetric label="Loan Balance" value={formatMoney(summary.totalLoans)} />
                <SummaryMetric label="SSS Loan Balance" value={formatMoney(summary.totalSssLoan)} />
                <SummaryMetric label="Pag-IBIG Loan Balance" value={formatMoney(summary.totalPagibigLoan)} />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <SummaryMetric label="PhilHealth Loan Balance" value={formatMoney(summary.totalPhilhealthLoan)} />
                <SummaryMetric label="Suggested Gross Salary" value={formatMoney(summary.suggestions?.totalRegularWage)} />
              </div>

              <SummaryTable
                title="Hours Worked"
                rows={summary.hoursWorked || []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "hours", label: "Hours", align: "right" },
                ]}
              />

              <SummaryTable
                title="Leaves"
                rows={summary.leaves || []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "leaveType", label: "Leave Type" },
                  { key: "leaveRate", label: "Leave Rate", align: "right", format: (value) => formatMoney(value) },
                ]}
              />

              <SummaryTable
                title="Overtime"
                rows={summary.overtime || []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "overtime", label: "Overtime", align: "right" },
                ]}
              />

              <SummaryTable
                title="Late"
                rows={summary.lateHours || []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "late", label: "Late", align: "right" },
                ]}
              />

              <SummaryTable
                title="Undertime"
                rows={summary.undertime || []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "undertime", label: "Undertime", align: "right" },
                ]}
              />

              <SummaryTable
                title="Cash Advance"
                rows={summary.cashadvance || []}
                columns={[
                  { key: "atd", label: "ATD" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount", align: "right", format: (value) => formatMoney(value) },
                ]}
              />

              <SummaryTable
                title="Loan"
                rows={summary.loan || []}
                columns={[
                  { key: "atd", label: "ATD" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount", align: "right", format: (value) => formatMoney(value) },
                  { key: "installmentPlan", label: "Installments", align: "right" },
                ]}
              />

              <SummaryTable
                title="SSS Loan"
                rows={summary.sssloan || []}
                columns={[
                  { key: "atd", label: "ATD" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount", align: "right", format: (value) => formatMoney(value) },
                  { key: "installmentPlan", label: "Installments", align: "right" },
                ]}
              />

              <SummaryTable
                title="Pag-IBIG Loan"
                rows={summary.pagibigloan || []}
                columns={[
                  { key: "atd", label: "ATD" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount", align: "right", format: (value) => formatMoney(value) },
                  { key: "installmentPlan", label: "Installments", align: "right" },
                ]}
              />

              <SummaryTable
                title="PhilHealth Loan"
                rows={summary.philhealthloan || []}
                columns={[
                  { key: "atd", label: "ATD" },
                  { key: "date", label: "Date" },
                  { key: "amount", label: "Amount", align: "right", format: (value) => formatMoney(value) },
                  { key: "installmentPlan", label: "Installments", align: "right" },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function SummaryTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  columns: Array<{ key: string; label: string; align?: "left" | "right"; format?: (value: unknown) => string }>;
}) {
  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-md border border-line bg-white">
      <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{title}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    "border-b border-line bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600",
                    column.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {columns.map((column) => {
                  const rawValue = row[column.key];
                  const value = column.format ? column.format(rawValue) : formatSummaryCell(rawValue);
                  return (
                    <td
                      key={`${title}-${rowIndex}-${column.key}`}
                      className={clsx(
                        "border-b border-line px-3 py-2 text-slate-700",
                        column.align === "right" ? "text-right" : "text-left"
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FieldControl({
  field,
  form,
  className,
  formVariant,
  employeeAssignment,
  employeeSelectGroups
}: {
  field: ResourceField;
  form: UseFormReturn<FormValues>;
  className?: string;
  formVariant?: FormVariant;
  employeeAssignment?: EmployeeAssignmentConfig;
  employeeSelectGroups?: EmployeeSelectGroup[];
}) {
  const error = form.formState.errors[field.name]?.message;
  const isSearchableEmployeeSelect = field.type === "select" && field.name === "employeeId";
  const isLeaveRequestVariant = formVariant === "leave-request";
  const isLeaveBalanceVariant = formVariant === "leave-balance";
  const isUserAccountVariant = formVariant === "user-account";
  const isPayrollRunVariant = formVariant === "payroll-run";
  const isAutoFilledStoreField = isUserAccountVariant && field.type === "select" && field.name === "storeId";
  const isEnhancedLeaveVariant = isLeaveRequestVariant || isLeaveBalanceVariant;
  const isEnhancedVariant = isEnhancedLeaveVariant || isUserAccountVariant || isPayrollRunVariant;
  const isReadOnly = Boolean(field.readOnly);
  const labelClassName = isEnhancedVariant
    ? "mb-1.5 block text-[12px] font-semibold text-slate-700"
    : "mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700";
  const inputClassName = isEnhancedVariant
    ? "h-11 rounded-md border-line bg-white text-[15px]"
    : "h-10 rounded-md border-line bg-white";
  const selectClassName = isEnhancedVariant
    ? "h-11 w-full rounded-md border border-line bg-white px-3 text-[15px] font-medium text-ink outline-none transition hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30"
    : "h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30";

  if ((field.name === "legacyEmployeeIds" || field.name === "memberIdsCsv") && employeeAssignment?.enabled) {
    return (
      <EmployeeAssignmentPicker
        field={field}
        form={form}
        className={className}
        error={error}
        employeeAssignment={employeeAssignment}
      />
    );
  }

  const common = {
    id: field.name,
    placeholder: field.placeholder,
    ...form.register(field.name)
  };

  return (
    <label className={className}>
      <span className={labelClassName}>
        {field.label}
        {field.required ? <span className="text-red-600"> *</span> : null}
      </span>
      {field.type === "textarea" ? (
        <Textarea className={isEnhancedVariant ? "min-h-24 rounded-md border-line bg-white text-[15px]" : "min-h-20 rounded-md border-line bg-white"} {...common} />
      ) : field.type === "select" ? (
        isSearchableEmployeeSelect ? (
          <SearchableSelectField field={field} form={form} employeeSelectGroups={employeeSelectGroups} formVariant={formVariant} />
        ) : (
          <select
            className={selectClassName}
            disabled={isAutoFilledStoreField || isReadOnly}
            {...common}
          >
            {field.options?.map((option) => (
              <option key={`${option.value}-${option.label}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      ) : (
        <Input
          className={inputClassName}
          type={field.type === "password" ? "password" : field.type}
          readOnly={isReadOnly}
          {...common}
        />
      )}
      {isAutoFilledStoreField ? <span className="mt-1 block text-[11px] text-slate-500">Auto-filled from selected employee.</span> : null}
      {isReadOnly ? <span className="mt-1 block text-[11px] text-slate-500">Auto-computed.</span> : null}
      {typeof error === "string" ? <span className="mt-1 block text-xs text-signal-red">! {error}</span> : null}
    </label>
  );
}

function SearchableSelectField({
  field,
  form,
  employeeSelectGroups,
  formVariant
}: {
  field: ResourceField;
  form: UseFormReturn<FormValues>;
  employeeSelectGroups?: EmployeeSelectGroup[];
  formVariant?: FormVariant;
}) {
  const isEnhancedVariant =
    formVariant === "leave-request" ||
    formVariant === "leave-balance" ||
    formVariant === "user-account" ||
    formVariant === "payroll-run";
  const isUserAccountVariant = formVariant === "user-account";
  const [groupFilter, setGroupFilter] = useState("all");
  const [finder, setFinder] = useState("");
  const currentValue = form.watch(field.name) || "";
  const options = field.options || [];
  const hasGroups = Boolean(employeeSelectGroups?.length);

  const groupMembers = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const group of employeeSelectGroups || []) {
      map.set(group.id, new Set(group.memberIds));
    }
    return map;
  }, [employeeSelectGroups]);

  const groupFilteredOptions = useMemo(() => {
    if (!hasGroups || groupFilter === "all") return options;
    const memberIds = groupMembers.get(groupFilter);
    if (!memberIds || !memberIds.size) return [];
    return options.filter((option) => {
      const employeeId = Number(option.value);
      return Number.isInteger(employeeId) && memberIds.has(employeeId);
    });
  }, [groupFilter, groupMembers, hasGroups, options]);

  const filteredOptions = useMemo(() => {
    const term = finder.trim().toLowerCase();
    if (!term) return groupFilteredOptions;
    return groupFilteredOptions.filter((option) => option.label.toLowerCase().includes(term));
  }, [finder, groupFilteredOptions]);

  const groupsWithCounts = useMemo(() => {
    const availableIds = new Set(
      options
        .map((option) => Number(option.value))
        .filter((employeeId) => Number.isInteger(employeeId) && employeeId > 0)
    );

    return (employeeSelectGroups || []).map((group) => {
      const memberCount = group.memberIds.filter((id) => availableIds.has(id)).length;
      return {
        ...group,
        memberCount,
      };
    });
  }, [employeeSelectGroups, options]);

  useEffect(() => {
    const searchTerm = finder.trim().toLowerCase();
    if (!searchTerm) return;
    if (!filteredOptions.length) return;

    const hasCurrentInFiltered = filteredOptions.some((option) => option.value === currentValue);
    const exactCodeMatch = filteredOptions.find(
      (option) => employeeCodeFromOptionLabel(option.label).toLowerCase() === searchTerm
    );
    const prefixCodeMatch = filteredOptions.find((option) =>
      employeeCodeFromOptionLabel(option.label).toLowerCase().startsWith(searchTerm)
    );
    const preferred = exactCodeMatch || prefixCodeMatch || (filteredOptions.length === 1 ? filteredOptions[0] : null);

    if (preferred && preferred.value !== currentValue) {
      form.setValue(field.name, preferred.value, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (!hasCurrentInFiltered) {
      form.setValue(field.name, filteredOptions[0].value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [currentValue, field.name, filteredOptions, finder, form]);

  function handleGroupChange(nextGroup: string) {
    setGroupFilter(nextGroup);
    const nextGroupOptions = filterOptionsByGroup({
      options,
      hasGroups,
      groupMembers,
      groupFilter: nextGroup,
    });

    if (nextGroupOptions.some((option) => option.value === currentValue)) {
      return;
    }

    const fallbackValue = nextGroupOptions[0]?.value || "";
    form.setValue(field.name, fallbackValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="space-y-1.5">
      {hasGroups ? (
        <div className={isUserAccountVariant ? "grid grid-cols-1 gap-2 md:grid-cols-[220px_minmax(0,1fr)]" : "grid grid-cols-1 gap-2 md:grid-cols-2"}>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Group</span>
            <select
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
              value={groupFilter}
              onChange={(event) => handleGroupChange(event.target.value)}
            >
              <option value="all">All employees</option>
              {groupsWithCounts.map((group) => (
                <option key={group.id} value={group.id} disabled={group.memberCount === 0}>
                  {group.name} ({group.memberCount})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className={isEnhancedVariant ? "h-10 rounded-md border-line bg-white pl-9 text-[14px]" : "h-9 rounded-md border-line bg-white pl-9"}
                value={finder}
                onChange={(event) => setFinder(event.target.value)}
                placeholder="Find by code, name, or store"
              />
            </div>
          </label>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className={isEnhancedVariant ? "h-10 rounded-md border-line bg-white pl-9 text-[14px]" : "h-9 rounded-md border-line bg-white pl-9"}
            value={finder}
            onChange={(event) => setFinder(event.target.value)}
            placeholder="Find by code, name, or store"
          />
        </div>
      )}
      <select
        className={
          isEnhancedVariant
            ? "h-11 w-full rounded-md border border-line bg-white px-3 text-[15px] font-medium text-ink outline-none transition hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30"
            : "h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink outline-none transition hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30"
        }
        id={field.name}
        {...form.register(field.name)}
      >
        {filteredOptions.length === 0 ? (
          <option value="">No employees found</option>
        ) : null}
        {filteredOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-slate-500">{filteredOptions.length} match(es)</p>
    </div>
  );
}

function filterOptionsByGroup(params: {
  options: Array<{ label: string; value: string }>;
  hasGroups: boolean;
  groupMembers: Map<string, Set<number>>;
  groupFilter: string;
}) {
  const { options, hasGroups, groupMembers, groupFilter } = params;
  if (!hasGroups || groupFilter === "all") return options;
  const memberIds = groupMembers.get(groupFilter);
  if (!memberIds || !memberIds.size) return [];
  return options.filter((option) => {
    const employeeId = Number(option.value);
    return Number.isInteger(employeeId) && memberIds.has(employeeId);
  });
}

function employeeCodeFromOptionLabel(label: string) {
  const [first] = label.split(" - ");
  return first.trim();
}

function EmployeeAssignmentPicker({
  field,
  form,
  className,
  error,
  employeeAssignment
}: {
  field: ResourceField;
  form: UseFormReturn<FormValues>;
  className?: string;
  error: unknown;
  employeeAssignment: EmployeeAssignmentConfig;
}) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [finder, setFinder] = useState("");
  const rawValue = form.watch(field.name) || "";

  const selectedIds = useMemo(() => parseEmployeeIdsCsv(rawValue), [rawValue]);
  const groupMembers = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const group of employeeAssignment.groups) {
      map.set(group.id, new Set(group.memberIds));
    }
    return map;
  }, [employeeAssignment.groups]);

  const filteredEmployees = useMemo(() => {
    const byGroup =
      groupFilter === "all"
        ? employeeAssignment.employees
        : employeeAssignment.employees.filter((employee) => groupMembers.get(groupFilter)?.has(employee.id));

    const term = finder.trim().toLowerCase();
    if (!term) return byGroup;
    return byGroup.filter((employee) => employee.label.toLowerCase().includes(term));
  }, [employeeAssignment.employees, finder, groupFilter, groupMembers]);

  function writeSelected(next: Set<number>) {
    const ids = Array.from(next).sort((a, b) => a - b);
    form.setValue(field.name, ids.join(","), { shouldDirty: true, shouldValidate: true });
  }

  function selectVisible() {
    const next = new Set(selectedIds);
    for (const employee of filteredEmployees) {
      next.add(employee.id);
    }
    writeSelected(next);
  }

  function clearVisible() {
    if (!filteredEmployees.length) return;
    const visible = new Set(filteredEmployees.map((employee) => employee.id));
    const next = new Set<number>();
    for (const id of selectedIds) {
      if (!visible.has(id)) {
        next.add(id);
      }
    }
    writeSelected(next);
  }

  function clearAll() {
    form.setValue(field.name, "", { shouldDirty: true, shouldValidate: true });
  }

  function toggleEmployee(employeeId: number, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(employeeId);
    } else {
      next.delete(employeeId);
    }
    writeSelected(next);
  }

  return (
    <div className={clsx("md:col-span-2", className)}>
      <input type="hidden" {...form.register(field.name)} />
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">{field.label}</span>

      <div className="space-y-2 border border-line bg-white p-2.5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Group</span>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
            >
              <option value="all">All employees</option>
              {employeeAssignment.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.memberIds.length})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">Search</span>
            <Input
              className="h-9 rounded-md border-line bg-white"
              value={finder}
              onChange={(event) => setFinder(event.target.value)}
              placeholder="Search employee"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={selectVisible}
            disabled={!filteredEmployees.length}
          >
            Select Visible
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={clearVisible}
            disabled={!filteredEmployees.length || selectedIds.size === 0}
          >
            Clear Visible
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-brand-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={clearAll}
            disabled={selectedIds.size === 0}
          >
            Clear All
          </button>
        </div>

        <div className="max-h-[220px] space-y-1 overflow-y-auto border border-line bg-white p-2">
          {filteredEmployees.map((employee) => {
            const checked = selectedIds.has(employee.id);
            return (
              <label key={employee.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-line accent-[#0051d5]"
                  checked={checked}
                  onChange={(event) => toggleEmployee(employee.id, event.target.checked)}
                />
                <span className="min-w-0 text-sm text-slate-700">{employee.label}</span>
              </label>
            );
          })}
          {filteredEmployees.length === 0 ? <p className="px-2 py-2 text-sm text-slate-500">No employees found.</p> : null}
        </div>

        <p className="text-xs text-slate-500">
          {selectedIds.size} selected / {filteredEmployees.length} visible
        </p>
      </div>

      {typeof error === "string" ? <span className="mt-1 block text-xs text-signal-red">! {error}</span> : null}
    </div>
  );
}

function fieldSpanClass(field: ResourceField, formVariant: FormVariant = "default") {
  if (formVariant === "leave-request") {
    if (field.name === "employeeId" || field.name === "reason") {
      return "md:col-span-2";
    }
    return "";
  }

  if (formVariant === "leave-balance") {
    if (field.name === "employeeId") {
      return "md:col-span-2";
    }
    return "";
  }

  if (formVariant === "user-account") {
    if (field.name === "employeeId" || field.name === "storeId") {
      return "md:col-span-2";
    }
    return "";
  }

  if (formVariant === "cash-advance") {
    if (field.name === "employeeId" || field.name === "reason") {
      return "md:col-span-2";
    }
    return "";
  }

  if (formVariant === "payroll-run") {
    if (field.name === "employeeId") {
      return "md:col-span-2";
    }
    return "";
  }

  const name = field.name.toLowerCase();

  if (field.type === "textarea") {
    return "md:col-span-2";
  }

  if (
    name.includes("address") ||
    name.includes("remarks") ||
    name.includes("reason") ||
    name.includes("description")
  ) {
    return "md:col-span-2";
  }

  return "";
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatNumberForForm(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = round2(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toString();
}

function computeInclusiveDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) return null;
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function humanizeStatus(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!normalized) return "-";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCoverage(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "-";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function computeRemainingLeaves(totalRaw?: string, usedRaw?: string) {
  const total = Number(totalRaw ?? 0);
  const used = Number(usedRaw ?? 0);
  if (Number.isNaN(total) || Number.isNaN(used)) return null;
  return Math.max(0, total - used);
}

function formatLeaveCount(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-PH").format(value);
}

function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatSummaryCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function parseEmployeeIdsCsv(value: string) {
  if (!value) return new Set<number>();
  const ids = value
    .split(",")
    .map((token) => Number(token.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  return new Set(ids);
}

function buildSchema(fields: ResourceField[]) {
  const shape = fields.reduce<Record<string, z.ZodType<string>>>((result, field) => {
    result[field.name] = field.required
      ? z.string().min(1, `${field.label} is required`)
      : z.string().optional().or(z.literal("")) as z.ZodType<string>;
    return result;
  }, {});

  return z.object(shape);
}

function buildDefaultValues(fields: ResourceField[]) {
  return fields.reduce<FormValues>((values, field) => {
    values[field.name] = field.type === "select" ? field.options?.[0]?.value || "" : "";
    return values;
  }, {});
}

function buildInitialValues(fields: ResourceField[], record: ApiRecord | null) {
  const defaults = buildDefaultValues(fields);
  if (!record) return defaults;

  for (const field of fields) {
    if (field.name === "legacyEmployeeIds") {
      const preferred = record["assignedEmployeeIdsCsv"] ?? record["legacyEmployeeIds"];
      if (preferred !== undefined && preferred !== null) {
        defaults[field.name] = String(preferred);
      }
      continue;
    }

    const raw = record[field.name];
    if (raw === undefined || raw === null) {
      continue;
    }

    if (field.type === "date" && typeof raw === "string") {
      defaults[field.name] = raw.includes("T") ? raw.slice(0, 10) : raw;
      continue;
    }

    if (field.type === "time" && typeof raw === "string") {
      const match = raw.match(/T(\d{2}:\d{2})/);
      defaults[field.name] = match?.[1] || raw.slice(0, 5);
      continue;
    }

    if (field.type === "datetime-local" && typeof raw === "string") {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        const hours = String(parsed.getHours()).padStart(2, "0");
        const minutes = String(parsed.getMinutes()).padStart(2, "0");
        defaults[field.name] = `${year}-${month}-${day}T${hours}:${minutes}`;
      } else {
        defaults[field.name] = raw.slice(0, 16);
      }
      continue;
    }

    if (field.type === "select" && typeof raw === "boolean") {
      defaults[field.name] = raw ? "true" : "false";
      continue;
    }

    defaults[field.name] = String(raw);
  }

  return defaults;
}

function normalizePayload(values: FormValues, fields: ResourceField[]) {
  return fields.reduce<ApiRecord>((payload, field) => {
    const raw = values[field.name];
    if (field.name === "legacyEmployeeIds" || field.name === "memberIdsCsv") {
      payload[field.name] = raw ?? "";
      return payload;
    }
    if (raw === "" || raw === undefined) {
      return payload;
    }
    if (field.type === "datetime-local") {
      const parsed = new Date(raw);
      payload[field.name] = Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
      return payload;
    }
    if (field.type === "number" || field.coerceNumber) {
      payload[field.name] = Number(raw);
      return payload;
    }
    if (raw === "true") {
      payload[field.name] = true;
      return payload;
    }
    if (raw === "false") {
      payload[field.name] = false;
      return payload;
    }
    payload[field.name] = raw;
    return payload;
  }, {});
}
