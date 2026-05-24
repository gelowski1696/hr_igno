"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, PlaneTakeoff, Scale } from "lucide-react";
import { useMemo, useState } from "react";

import { createMyLeaveRequest, getMyLeaveBalance, getMyLeaves, type CreateLeaveRequestPayload } from "@/lib/api";
import { formatCell, humanize } from "@/lib/formatters";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  EmployeeErrorState,
  EmployeePageIntro,
  EmployeePageLoadingSkeleton,
  EmployeeSection,
  EmployeeStatCard,
  EmployeeTable,
} from "@/components/employee/employee-primitives";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type LeaveFormState = {
  leaveType: string;
  startDate: string;
  endDate: string;
  leaveRate: string;
  reason: string;
};

const defaultForm: LeaveFormState = {
  leaveType: "Vacation",
  startDate: "",
  endDate: "",
  leaveRate: "",
  reason: "",
};

export default function EmployeeLeavesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LeaveFormState>(defaultForm);
  const [formMessage, setFormMessage] = useState("");

  const leavesQuery = useQuery({
    queryKey: ["employee", "leaves"],
    queryFn: getMyLeaves,
  });

  const balanceQuery = useQuery({
    queryKey: ["employee", "leave-balance"],
    queryFn: async () => getMyLeaveBalance().catch(() => null),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateLeaveRequestPayload) => createMyLeaveRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", "leaves"] });
      queryClient.invalidateQueries({ queryKey: ["employee", "leave-balance"] });
      setForm(defaultForm);
      setFormMessage("Leave request submitted.");
      toastSuccess("Leave request submitted.");
    },
    onError: (error) => {
      setFormMessage(error instanceof Error ? error.message : "Unable to submit leave request.");
      toastError(error instanceof Error ? error.message : "Unable to submit leave request.");
    },
  });

  const rows = useMemo(() => leavesQuery.data || [], [leavesQuery.data]);
  const pending = useMemo(() => rows.filter((row) => String(row.status || "").toUpperCase() === "PENDING"), [rows]);
  const approved = useMemo(() => rows.filter((row) => String(row.status || "").toUpperCase() === "APPROVED"), [rows]);

  const totalDaysRequested = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.duration || 0), 0),
    [rows],
  );

  const leaveBalance = balanceQuery.data;

  async function submitLeaveRequest() {
    setFormMessage("");
    if (!form.startDate || !form.endDate) {
      setFormMessage("Start date and end date are required.");
      toastError("Start date and end date are required.");
      return;
    }
    if (form.endDate < form.startDate) {
      setFormMessage("End date must be on or after start date.");
      toastError("End date must be on or after start date.");
      return;
    }

    await createMutation.mutateAsync({
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason.trim() || undefined,
      leaveRate: form.leaveRate ? Number(form.leaveRate) : undefined,
    });
  }

  if (leavesQuery.isLoading || balanceQuery.isLoading) {
    return <EmployeePageLoadingSkeleton />;
  }

  if (leavesQuery.isError) {
    return <EmployeeErrorState message={(leavesQuery.error as Error).message || "Unable to load leaves."} />;
  }

  return (
    <section className="w-full space-y-5">
      <EmployeePageIntro
        title="My Leaves"
        description="Submit leave requests and monitor your approval status and leave balances."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeStatCard
          label="VL Remaining"
          value={String(leaveBalance?.VL.remaining ?? 0)}
          hint={`Used ${leaveBalance?.VL.used ?? 0} of ${leaveBalance?.VL.total ?? 0}`}
          icon={<Scale className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="SL Remaining"
          value={String(leaveBalance?.SL.remaining ?? 0)}
          hint={`Used ${leaveBalance?.SL.used ?? 0} of ${leaveBalance?.SL.total ?? 0}`}
          icon={<Scale className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="Pending Requests"
          value={String(pending.length)}
          hint="Waiting for approval."
          icon={<PlaneTakeoff className="h-4 w-4" />}
          tone={pending.length ? "amber" : "green"}
        />
        <EmployeeStatCard
          label="Approved Requests"
          value={String(approved.length)}
          hint={`${totalDaysRequested} total day(s) requested.`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <EmployeeSection title="New Leave Request" icon={<PlaneTakeoff className="h-4 w-4 text-brand-600" />}>
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Leave Type</span>
              <select
                className="h-10 w-full rounded-md border-[1.5px] border-strongline bg-field px-3 text-sm font-medium text-ink outline-none transition hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30"
                value={form.leaveType}
                onChange={(event) => setForm((previous) => ({ ...previous, leaveType: event.target.value }))}
              >
                <option value="Vacation">Vacation Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Lwop">Leave Without Pay</option>
                <option value="HalfAM">Half Day AM</option>
                <option value="HalfPM">Half Day PM</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Leave Rate</span>
              <Input
                type="number"
                className="h-10"
                placeholder="Optional"
                value={form.leaveRate}
                onChange={(event) => setForm((previous) => ({ ...previous, leaveRate: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Start Date</span>
              <Input
                type="date"
                className="h-10"
                value={form.startDate}
                onChange={(event) => setForm((previous) => ({ ...previous, startDate: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">End Date</span>
              <Input
                type="date"
                className="h-10"
                value={form.endDate}
                onChange={(event) => setForm((previous) => ({ ...previous, endDate: event.target.value }))}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Reason</span>
              <Textarea
                placeholder="Tell your manager why this leave is needed."
                value={form.reason}
                onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
              />
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">{formMessage || "Your request will be submitted with pending status."}</div>
              <Button className="h-10 px-4" onClick={submitLeaveRequest} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit Request
              </Button>
            </div>
          </div>
        </EmployeeSection>

        <EmployeeSection title="Leave History" icon={<Scale className="h-4 w-4 text-brand-600" />} subtitle={`${rows.length} record(s)`}>
          <EmployeeTable
            columns={[
              { key: "leaveType", label: "Type", render: (row) => humanize(String(row.leaveType || "-")) },
              { key: "coverage", label: "Coverage", render: (row) => `${formatCell(row.startDate, "date")} - ${formatCell(row.endDate, "date")}` },
              { key: "days", label: "Days", render: (row) => String(row.duration || 0) },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status || "PENDING"} /> },
              { key: "reason", label: "Reason", hideOnMobile: true, render: (row) => String(row.reason || "-") },
              { key: "requested", label: "Requested", hideOnMobile: true, render: (row) => formatCell(row.createdAt, "datetime") },
            ]}
            rows={rows as Array<Record<string, unknown>>}
            emptyLabel="No leave records yet."
            renderCardTitle={(row) => humanize(String(row.leaveType || "Leave"))}
            renderCardMeta={(row) => formatCell(row.createdAt, "date")}
            mobilePriorityKeys={["status", "coverage", "days"]}
            mobileFieldLimit={4}
          />
        </EmployeeSection>
      </section>
    </section>
  );
}
