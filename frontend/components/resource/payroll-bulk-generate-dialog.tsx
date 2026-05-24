"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, Loader2, RefreshCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { apiFetch, listResource } from "@/lib/api";
import { formatMoney } from "@/lib/formatters";
import type { ApiRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onClose: () => void;
};

type EmployeeOption = {
  id: number;
  employeeCode: string;
  fullName: string;
  storeArea: string;
  salaryRate: number;
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
};

type EmployeeGroup = {
  id: string;
  name: string;
  memberIds: number[];
};

type PayrollPreviewRow = {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  storeArea?: string | null;
  totalDaysWorked?: number;
  totalLeaveRate?: number;
  totalCashAdvance?: number;
  totalLoans?: number;
  totalSssLoan?: number;
  totalPagibigLoan?: number;
  totalPhilhealthLoan?: number;
  suggestions?: {
    daysOfWork?: number;
    rate?: number;
    overtimeHours?: number;
    lateHours?: number;
    overtimeAmount?: number;
    lateAmount?: number;
    addOnHoliday?: number;
    sssDeduction?: number;
    philhealthDeduction?: number;
    pagibigDeduction?: number;
    valeDeduction?: number;
    loanDeduction?: number;
    sssLoan?: number;
    pagibigLoan?: number;
    philhealthLoan?: number;
  };
};

type PayrollGridRow = {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  storeArea: string;
  included: boolean;
  daysOfWork: number;
  rate: number;
  totalRegularWage: number;
  overtimeHours: number;
  overtimeAmount: number;
  lateHours: number;
  lateAmount: number;
  addOnHoliday: number;
  allowance: number;
  bonusRate: number;
  penaltyOrUndertime: number;
  penaltyRate: number;
  pondo: number;
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  valeDeduction: number;
  loanDeduction: number;
  sssLoan: number;
  pagibigLoan: number;
  philhealthLoan: number;
  charge: number;
  credit: number;
  totalAllowance: number;
  otherDeduction: number;
  totalAmount: number;
  netAmountPaid: number;
};

type EditableNumericField =
  | "daysOfWork"
  | "rate"
  | "overtimeAmount"
  | "lateAmount"
  | "addOnHoliday"
  | "allowance"
  | "bonusRate"
  | "penaltyOrUndertime"
  | "penaltyRate"
  | "pondo"
  | "sssDeduction"
  | "philhealthDeduction"
  | "pagibigDeduction"
  | "valeDeduction"
  | "loanDeduction"
  | "sssLoan"
  | "pagibigLoan"
  | "philhealthLoan"
  | "charge"
  | "credit";

const STICKY_USE_WIDTH = 96;
const STICKY_EMPLOYEE_ID_WIDTH = 122;
const STICKY_EMPLOYEE_NAME_WIDTH = 280;
const STICKY_EMPLOYEE_ID_LEFT = STICKY_USE_WIDTH;
const STICKY_EMPLOYEE_NAME_LEFT = STICKY_USE_WIDTH + STICKY_EMPLOYEE_ID_WIDTH;

export function PayrollBulkGenerateDialog({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => manilaDateInput());
  const [endDate, setEndDate] = useState(() => manilaDateInput());
  const [groupFilter, setGroupFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [status, setStatus] = useState("DRAFT");
  const [skipExisting, setSkipExisting] = useState("yes");
  const [rows, setRows] = useState<PayrollGridRow[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [infoText, setInfoText] = useState("");

  const employeesQuery = useQuery({
    queryKey: ["payroll-bulk", "employees"],
    queryFn: () => listResource("employees"),
    enabled: open,
  });

  const groupsQuery = useQuery({
    queryKey: ["payroll-bulk", "employee-groups"],
    queryFn: () => listResource("employee-groups"),
    enabled: open,
  });

  const employees = useMemo(() => {
    return (employeesQuery.data || [])
      .map((row) => mapEmployeeOption(row))
      .filter((row): row is EmployeeOption => Boolean(row))
      .sort((left, right) => left.employeeCode.localeCompare(right.employeeCode));
  }, [employeesQuery.data]);

  const groups = useMemo(() => {
    return (groupsQuery.data || [])
      .map((row) => mapEmployeeGroup(row))
      .filter((row): row is EmployeeGroup => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [groupsQuery.data]);

  const groupMembers = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const group of groups) {
      map.set(group.id, new Set(group.memberIds));
    }
    return map;
  }, [groups]);

  const groupsWithCounts = useMemo(() => {
    const available = new Set(employees.map((employee) => employee.id));
    return groups.map((group) => ({
      ...group,
      memberCount: group.memberIds.filter((id) => available.has(id)).length,
    }));
  }, [employees, groups]);

  const filteredEmployees = useMemo(() => {
    const byGroup =
      groupFilter === "all"
        ? employees
        : employees.filter((employee) => groupMembers.get(groupFilter)?.has(employee.id));

    const term = searchTerm.trim().toLowerCase();
    if (!term) return byGroup;
    return byGroup.filter((employee) => matchesEmployee(employee, term));
  }, [employees, groupFilter, groupMembers, searchTerm]);

  const visibleRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (groupFilter !== "all") {
        const memberIds = groupMembers.get(groupFilter);
        if (!memberIds?.has(row.employeeId)) return false;
      }
      if (!term) return true;
      return matchesRow(row, term);
    });
  }, [groupFilter, groupMembers, rows, searchTerm]);

  const includedRows = useMemo(() => rows.filter((row) => row.included), [rows]);

  const summary = useMemo(() => {
    return includedRows.reduce(
      (accumulator, row) => {
        accumulator.net += row.netAmountPaid;
        accumulator.gross += row.totalRegularWage;
        accumulator.deductions += row.otherDeduction + row.totalAllowance + row.charge;
        return accumulator;
      },
      { net: 0, gross: 0, deductions: 0 },
    );
  }, [includedRows]);

  if (!open) {
    return null;
  }

  const loadingReferenceData = employeesQuery.isLoading || groupsQuery.isLoading;

  async function loadSheet() {
    setErrorText("");
    setInfoText("");

    if (!startDate || !endDate) {
      setErrorText("Select a start date and end date first.");
      return;
    }
    if (new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime()) {
      setErrorText("End date must be on or after start date.");
      return;
    }
    if (!filteredEmployees.length) {
      setErrorText("No employees match your group/search filter.");
      return;
    }

    setIsLoadingSheet(true);
    try {
      const employeeIds = filteredEmployees.map((employee) => employee.id);
      const previews = await apiFetch<PayrollPreviewRow[]>("payroll/preview", {
        method: "POST",
        body: JSON.stringify({
          startDate,
          endDate,
          employeeIds,
          employee_ids: employeeIds,
        }),
      });

      const previewMap = new Map<number, PayrollPreviewRow>();
      for (const preview of previews || []) {
        previewMap.set(preview.employeeId, preview);
      }

      const nextRows = filteredEmployees.map((employee) => {
        const preview = previewMap.get(employee.id);
        return createGridRow(employee, preview);
      });

      setRows(nextRows);
      setInfoText(`Loaded ${nextRows.length} payroll row(s). You can edit values directly in the sheet.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load payroll sheet.";
      setErrorText(message);
      setRows([]);
    } finally {
      setIsLoadingSheet(false);
    }
  }

  function updateNumericCell(employeeId: number, key: EditableNumericField, raw: string) {
    const value = toNumber(raw);
    setRows((previous) =>
      previous.map((row) => (row.employeeId === employeeId ? recalculateRow({ ...row, [key]: value }) : row)),
    );
  }

  function toggleRowIncluded(employeeId: number) {
    setRows((previous) =>
      previous.map((row) => (row.employeeId === employeeId ? { ...row, included: !row.included } : row)),
    );
  }

  function setIncludedForVisible(nextIncluded: boolean) {
    const visibleIds = new Set(visibleRows.map((row) => row.employeeId));
    if (!visibleIds.size) return;
    setRows((previous) =>
      previous.map((row) =>
        visibleIds.has(row.employeeId)
          ? {
              ...row,
              included: nextIncluded,
            }
          : row,
      ),
    );
  }

  async function generatePayrollRows() {
    setErrorText("");
    setInfoText("");

    if (!startDate || !endDate) {
      setErrorText("Select payroll period first.");
      return;
    }

    const selected = rows.filter((row) => row.included);
    if (!selected.length) {
      setErrorText("No included rows to save.");
      return;
    }

    setIsSubmitting(true);
    try {
      const existingIds = new Set<number>();
      if (skipExisting === "yes") {
        const existingPayroll = await listResource("payroll");
        for (const record of existingPayroll) {
          const employeeId = extractEmployeeId(record);
          if (!employeeId) continue;
          if (readDateOnly(record.payrollFrom) !== startDate) continue;
          if (readDateOnly(record.payrollTo) !== endDate) continue;
          if (String(record.status || "").toUpperCase() === "VOIDED") continue;
          existingIds.add(employeeId);
        }
      }

      const toCreate = selected.filter((row) => !existingIds.has(row.employeeId));
      const skipped = selected.length - toCreate.length;

      const failures: Array<{ row: PayrollGridRow; message: string }> = [];
      let created = 0;

      for (let index = 0; index < toCreate.length; index += 8) {
        const batch = toCreate.slice(index, index + 8);
        const results = await Promise.all(
          batch.map(async (row) => {
            try {
              await apiFetch("payroll", {
                method: "POST",
                body: JSON.stringify(buildPayrollPayload(row, startDate, endDate, payMethod, status)),
              });
              return { ok: true as const };
            } catch (error) {
              return {
                ok: false as const,
                message: error instanceof Error ? error.message : "Unable to save row.",
                row,
              };
            }
          }),
        );

        for (const result of results) {
          if (result.ok) {
            created += 1;
            continue;
          }
          failures.push({ row: result.row, message: result.message });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["resource"] });
      const failureText = failures.length
        ? ` Failed: ${failures.length} (${failures
            .slice(0, 2)
            .map((item) => `${item.row.employeeCode} - ${item.message}`)
            .join(" | ")}).`
        : "";
      setInfoText(`Saved ${created} payroll row(s). Skipped existing: ${skipped}.${failureText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate payroll.";
      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/35">
      <div className="ml-auto flex h-full w-full flex-col border-l-[1.5px] border-line bg-field shadow-overlay">
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-600">Payroll</p>
            <h2 className="text-2xl font-bold text-ink">Group Payroll Sheet</h2>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close group payroll sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b-[1.5px] border-line px-4 py-3">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-6">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Start date</span>
              <Input type="date" className="h-9 rounded-md" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">End date</span>
              <Input type="date" className="h-9 rounded-md" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Pay method</span>
              <select
                className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Gcash">Gcash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Status</span>
              <select
                className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PREVIEWED">Previewed</option>
                <option value="RELEASED">Released</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Skip existing</span>
              <select
                className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
                value={skipExisting}
                onChange={(event) => setSkipExisting(event.target.value)}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button
                className="h-9 w-full rounded-md px-3"
                onClick={() => void loadSheet()}
                icon={isLoadingSheet ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                disabled={isLoadingSheet || isSubmitting || loadingReferenceData}
              >
                {isLoadingSheet ? "Loading sheet" : "Load sheet"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[240px_minmax(0,1fr)_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Group</span>
              <select
                className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
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
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="h-9 rounded-md pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Find by code, name, or store"
                />
              </div>
            </label>

            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                className="h-9 rounded-md px-3"
                icon={<Ban className="h-4 w-4" />}
                disabled={!visibleRows.length || isSubmitting}
                onClick={() => setIncludedForVisible(false)}
              >
                Exclude visible
              </Button>
              <Button
                className="h-9 rounded-md px-3"
                disabled={!rows.length || !includedRows.length || isSubmitting || isLoadingSheet}
                icon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                onClick={() => void generatePayrollRows()}
              >
                {isSubmitting ? "Saving payroll" : "Save payroll"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-md border border-line bg-white px-2.5 py-1">{filteredEmployees.length} employee match(es)</span>
            <span className="rounded-md border border-line bg-white px-2.5 py-1">{rows.length} row(s) loaded</span>
            <span className="rounded-md border border-line bg-white px-2.5 py-1">{includedRows.length} row(s) included</span>
            <span className="rounded-md border border-line bg-white px-2.5 py-1">Gross {formatMoney(summary.gross)}</span>
            <span className="rounded-md border border-line bg-white px-2.5 py-1">Net {formatMoney(summary.net)}</span>
          </div>

          {errorText ? (
            <div className="border-l-[4px] border-signal-red bg-red-50 px-3 py-2 text-sm text-signal-red">{errorText}</div>
          ) : null}
          {infoText ? (
            <div className="border-l-[4px] border-signal-green bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{infoText}</div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-3 py-3">
          {loadingReferenceData ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading employees and groups...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center justify-center border border-dashed border-line bg-white p-6 text-sm text-slate-500">
              <div className="flex max-w-xl items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>
                  Set payroll period, group, and search filters, then click <span className="font-semibold text-ink">Load sheet</span> to start
                  bulk payroll entry in one grid.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto border border-line bg-white">
              <table className="w-full min-w-[2580px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th
                      className="sticky left-0 z-20 border-b border-r border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600"
                      style={{ width: STICKY_USE_WIDTH, minWidth: STICKY_USE_WIDTH }}
                    >
                      Use
                    </th>
                    <th
                      className="sticky z-20 border-b border-r border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600"
                      style={{
                        left: STICKY_EMPLOYEE_ID_LEFT,
                        width: STICKY_EMPLOYEE_ID_WIDTH,
                        minWidth: STICKY_EMPLOYEE_ID_WIDTH,
                      }}
                    >
                      Employee ID
                    </th>
                    <th
                      className="sticky z-20 border-b border-r border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600"
                      style={{
                        left: STICKY_EMPLOYEE_NAME_LEFT,
                        width: STICKY_EMPLOYEE_NAME_WIDTH,
                        minWidth: STICKY_EMPLOYEE_NAME_WIDTH,
                        maxWidth: STICKY_EMPLOYEE_NAME_WIDTH,
                      }}
                    >
                      Employee
                    </th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Store</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Days</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Rate</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Gross</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">OT Hrs</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">OT +</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Late Hrs</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Late -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Leave +</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Allowance +</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Bonus +</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Undertime -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Penalty -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Fund -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Cash Adv -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Loan -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">SSS Loan -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Pag-IBIG Loan -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">PhilHealth Loan -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">SSS</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">PhilHealth</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Pag-IBIG</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Charge -</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Credit +</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Total</th>
                    <th className="border-b border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.07em] text-slate-600">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.employeeId} className={row.included ? "hover:bg-slate-50/80" : "bg-slate-50/80 hover:bg-slate-100/80"}>
                      <td
                        className="sticky left-0 z-10 border-b border-r border-line bg-inherit px-2 py-2"
                        style={{ width: STICKY_USE_WIDTH, minWidth: STICKY_USE_WIDTH }}
                      >
                        <button
                          type="button"
                          className={
                            row.included
                              ? "inline-flex h-8 w-[72px] items-center justify-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                              : "inline-flex h-8 w-[72px] items-center justify-center rounded-md border border-line bg-white text-xs font-semibold text-slate-500 hover:bg-slate-50"
                          }
                          onClick={() => toggleRowIncluded(row.employeeId)}
                        >
                          {row.included ? "Included" : "Excluded"}
                        </button>
                      </td>
                      <td
                        className="sticky z-10 border-b border-r border-line bg-inherit px-3 py-2 font-mono text-xs font-semibold text-slate-700"
                        style={{
                          left: STICKY_EMPLOYEE_ID_LEFT,
                          width: STICKY_EMPLOYEE_ID_WIDTH,
                          minWidth: STICKY_EMPLOYEE_ID_WIDTH,
                        }}
                      >
                        {row.employeeCode}
                      </td>
                      <td
                        className="sticky z-10 border-b border-r border-line bg-inherit px-3 py-2 font-medium text-ink"
                        style={{
                          left: STICKY_EMPLOYEE_NAME_LEFT,
                          width: STICKY_EMPLOYEE_NAME_WIDTH,
                          minWidth: STICKY_EMPLOYEE_NAME_WIDTH,
                          maxWidth: STICKY_EMPLOYEE_NAME_WIDTH,
                        }}
                      >
                        <span className="block truncate" title={row.fullName}>
                          {row.fullName}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-2 text-slate-600">
                        <span className="block min-w-[90px] whitespace-nowrap">{row.storeArea || "-"}</span>
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.daysOfWork} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "daysOfWork", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.rate} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "rate", value)} />
                      </td>
                      <td className="border-b border-line bg-slate-50 px-3 py-2 font-semibold text-slate-800">{formatMoney(row.totalRegularWage)}</td>
                      <td className="border-b border-line bg-slate-50 px-3 py-2 text-slate-700">{formatFixed(row.overtimeHours)}</td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.overtimeAmount} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "overtimeAmount", value)} />
                      </td>
                      <td className="border-b border-line bg-slate-50 px-3 py-2 text-slate-700">{formatFixed(row.lateHours)}</td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.lateAmount} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "lateAmount", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.addOnHoliday} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "addOnHoliday", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.allowance} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "allowance", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.bonusRate} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "bonusRate", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput
                          value={row.penaltyOrUndertime}
                          step="0.01"
                          onChange={(value) => updateNumericCell(row.employeeId, "penaltyOrUndertime", value)}
                        />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.penaltyRate} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "penaltyRate", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.pondo} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "pondo", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.valeDeduction} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "valeDeduction", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.loanDeduction} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "loanDeduction", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.sssLoan} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "sssLoan", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.pagibigLoan} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "pagibigLoan", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput
                          value={row.philhealthLoan}
                          step="0.01"
                          onChange={(value) => updateNumericCell(row.employeeId, "philhealthLoan", value)}
                        />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.sssDeduction} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "sssDeduction", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput
                          value={row.philhealthDeduction}
                          step="0.01"
                          onChange={(value) => updateNumericCell(row.employeeId, "philhealthDeduction", value)}
                        />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.pagibigDeduction} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "pagibigDeduction", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.charge} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "charge", value)} />
                      </td>
                      <td className="border-b border-line px-2 py-2">
                        <NumericCellInput value={row.credit} step="0.01" onChange={(value) => updateNumericCell(row.employeeId, "credit", value)} />
                      </td>
                      <td className="border-b border-line bg-slate-50 px-3 py-2 font-semibold text-slate-800">{formatMoney(row.totalAmount)}</td>
                      <td className="border-b border-line bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">{formatMoney(row.netAmountPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumericCellInput({
  value,
  onChange,
  step = "0.01",
}: {
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <Input
      className="h-8 w-[110px] rounded-md border-line bg-white px-2 text-right text-xs font-semibold"
      inputMode="decimal"
      step={step}
      value={formatInputNumber(value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function mapEmployeeOption(row: ApiRecord): EmployeeOption | null {
  const id = Number(row.id ?? row.employeeId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const employeeCode = String(row.employeeCode ?? row.employee_code ?? "").trim();
  const firstName = String(row.firstName ?? row.first_name ?? "").trim();
  const lastName = String(row.lastName ?? row.last_name ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const storeArea = String(
    row.storeArea ??
      row.store_area ??
      (typeof row.store === "object" && row.store ? (row.store as Record<string, unknown>).area ?? "" : ""),
  ).trim();

  return {
    id,
    employeeCode: employeeCode || `EMP-${id}`,
    fullName: fullName || `Employee ${id}`,
    storeArea,
    salaryRate: toNumber(row.salary),
    sssContribution: toNumber(row.sssContribution),
    philhealthContribution: toNumber(row.philhealthContribution),
    pagibigContribution: toNumber(row.pagibigContribution),
  };
}

function mapEmployeeGroup(row: ApiRecord): EmployeeGroup | null {
  const idValue = row.id;
  const id = idValue === undefined || idValue === null ? "" : String(idValue).trim();
  const name = String(row.name || "").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    memberIds: extractEmployeeGroupMemberIds(row),
  };
}

function extractEmployeeGroupMemberIds(group: ApiRecord) {
  const ids = new Set<number>();
  const csv = typeof group.memberIdsCsv === "string" ? group.memberIdsCsv : "";

  for (const token of csv.split(",")) {
    const value = Number(token.trim());
    if (Number.isInteger(value) && value > 0) {
      ids.add(value);
    }
  }

  const members = Array.isArray(group.members) ? group.members : [];
  for (const memberRaw of members) {
    if (!memberRaw || typeof memberRaw !== "object") continue;
    const member = memberRaw as Record<string, unknown>;
    const directId = Number(member.employeeId);
    if (Number.isInteger(directId) && directId > 0) {
      ids.add(directId);
    }
    const nestedEmployee = member.employee;
    if (nestedEmployee && typeof nestedEmployee === "object") {
      const nestedId = Number((nestedEmployee as Record<string, unknown>).id);
      if (Number.isInteger(nestedId) && nestedId > 0) {
        ids.add(nestedId);
      }
    }
  }

  return Array.from(ids).sort((left, right) => left - right);
}

function createGridRow(employee: EmployeeOption, preview?: PayrollPreviewRow) {
  const suggestions = preview?.suggestions || {};
  const row: PayrollGridRow = {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    fullName: preview?.fullName || employee.fullName,
    storeArea: (preview?.storeArea || employee.storeArea || "").trim(),
    included: true,
    daysOfWork: toNumber(suggestions.daysOfWork ?? preview?.totalDaysWorked),
    rate: toNumber(suggestions.rate ?? employee.salaryRate),
    totalRegularWage: 0,
    overtimeHours: toNumber(suggestions.overtimeHours),
    overtimeAmount: toNumber(suggestions.overtimeAmount),
    lateHours: toNumber(suggestions.lateHours),
    lateAmount: toNumber(suggestions.lateAmount),
    addOnHoliday: toNumber(suggestions.addOnHoliday ?? preview?.totalLeaveRate),
    allowance: 0,
    bonusRate: 0,
    penaltyOrUndertime: 0,
    penaltyRate: 0,
    pondo: 0,
    sssDeduction: toNumber(suggestions.sssDeduction ?? employee.sssContribution),
    philhealthDeduction: toNumber(suggestions.philhealthDeduction ?? employee.philhealthContribution),
    pagibigDeduction: toNumber(suggestions.pagibigDeduction ?? employee.pagibigContribution),
    valeDeduction: toNumber(suggestions.valeDeduction ?? preview?.totalCashAdvance),
    loanDeduction: toNumber(suggestions.loanDeduction ?? preview?.totalLoans),
    sssLoan: toNumber(suggestions.sssLoan ?? preview?.totalSssLoan),
    pagibigLoan: toNumber(suggestions.pagibigLoan ?? preview?.totalPagibigLoan),
    philhealthLoan: toNumber(suggestions.philhealthLoan ?? preview?.totalPhilhealthLoan),
    charge: 0,
    credit: 0,
    totalAllowance: 0,
    otherDeduction: 0,
    totalAmount: 0,
    netAmountPaid: 0,
  };

  return recalculateRow(row);
}

function recalculateRow(row: PayrollGridRow) {
  const totalRegularWage = round2(row.daysOfWork * row.rate);
  const totalAllowance = round2(row.sssDeduction + row.philhealthDeduction + row.pagibigDeduction);
  const otherDeduction = round2(
    row.penaltyRate +
      row.pondo +
      row.penaltyOrUndertime +
      row.lateAmount +
      row.sssLoan +
      row.pagibigLoan +
      row.philhealthLoan +
      row.valeDeduction +
      row.loanDeduction,
  );
  const totalAmount = round2(totalRegularWage + row.overtimeAmount + row.addOnHoliday + row.bonusRate + row.allowance);
  const netAmountPaid = round2(totalAmount + row.credit - (totalAllowance + otherDeduction + row.charge));

  return {
    ...row,
    totalRegularWage,
    totalAllowance,
    otherDeduction,
    totalAmount,
    netAmountPaid,
  };
}

function buildPayrollPayload(row: PayrollGridRow, startDate: string, endDate: string, payMethod: string, status: string) {
  return {
    employeeId: row.employeeId,
    payrollFrom: startDate,
    payrollTo: endDate,
    payMethod,
    status,
    daysOfWork: row.daysOfWork,
    rate: row.rate,
    totalRegularWage: row.totalRegularWage,
    overtimeHours: row.overtimeHours,
    lateHours: row.lateHours,
    overtimeAmount: row.overtimeAmount,
    lateAmount: row.lateAmount,
    addOnHoliday: row.addOnHoliday,
    allowance: row.allowance,
    bonusRate: row.bonusRate,
    penaltyOrUndertime: row.penaltyOrUndertime,
    penaltyRate: row.penaltyRate,
    pondo: row.pondo,
    sssDeduction: row.sssDeduction,
    philhealthDeduction: row.philhealthDeduction,
    pagibigDeduction: row.pagibigDeduction,
    valeDeduction: row.valeDeduction,
    loanDeduction: row.loanDeduction,
    sssLoan: row.sssLoan,
    pagibigLoan: row.pagibigLoan,
    philhealthLoan: row.philhealthLoan,
    charge: row.charge,
    credit: row.credit,
    totalAllowance: row.totalAllowance,
    otherDeduction: row.otherDeduction,
    totalAmount: row.totalAmount,
    netAmountPaid: row.netAmountPaid,
  };
}

function matchesEmployee(employee: EmployeeOption, term: string) {
  const haystack = `${employee.employeeCode} ${employee.fullName} ${employee.storeArea}`.toLowerCase();
  return haystack.includes(term);
}

function matchesRow(row: PayrollGridRow, term: string) {
  const haystack = `${row.employeeCode} ${row.fullName} ${row.storeArea}`.toLowerCase();
  return haystack.includes(term);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function formatInputNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = round2(value);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatFixed(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return round2(value).toFixed(2);
}

function manilaDateInput(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
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

function extractEmployeeId(record: ApiRecord) {
  const direct = Number(record.employeeId);
  if (Number.isInteger(direct) && direct > 0) return direct;

  const employee = record.employee;
  if (employee && typeof employee === "object") {
    const nested = Number((employee as Record<string, unknown>).id);
    if (Number.isInteger(nested) && nested > 0) return nested;
  }

  return 0;
}
