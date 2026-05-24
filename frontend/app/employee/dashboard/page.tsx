"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, Landmark, PlaneTakeoff, ReceiptText, UserRound } from "lucide-react";
import { useMemo } from "react";

import {
  getEmployeeProfile,
  getMyAttendance,
  getMyCashAdvances,
  getMyLeaveBalance,
  getMyLeaves,
  getMyPayroll,
  type AttendanceRecord,
  type CashAdvanceRecord,
  type EmployeeProfile,
  type LeaveBalanceSummary,
  type LeaveRecord,
  type PayrollRecord,
} from "@/lib/api";
import { formatCell, humanize } from "@/lib/formatters";
import { getManilaDayRange } from "@/lib/timezone";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  EmployeeErrorState,
  EmployeePageIntro,
  EmployeePageLoadingSkeleton,
  EmployeeSection,
  EmployeeStatCard,
  EmployeeTable,
} from "@/components/employee/employee-primitives";

type DashboardData = {
  profile: EmployeeProfile | null;
  attendance: AttendanceRecord[];
  leaves: LeaveRecord[];
  leaveBalance: LeaveBalanceSummary | null;
  payroll: PayrollRecord[];
  advances: CashAdvanceRecord[];
};

export default function EmployeeDashboardPage() {
  const snapshot = useQuery({
    queryKey: ["employee", "dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const [profile, attendance, leaves, leaveBalanceResult, payroll, advances] = await Promise.all([
        getEmployeeProfile(),
        getMyAttendance(),
        getMyLeaves(),
        getMyLeaveBalance().catch(() => null),
        getMyPayroll(),
        getMyCashAdvances(),
      ]);

      return {
        profile,
        attendance,
        leaves,
        leaveBalance: leaveBalanceResult,
        payroll,
        advances,
      };
    },
  });

  const todayAttendance = useMemo(() => {
    const rows = snapshot.data?.attendance || [];
    const { start, end } = getManilaDayRange();
    return rows.filter((row) => {
      const raw = row.timeIn || row.createdAt;
      if (!raw) return false;
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed >= start && parsed < end;
    });
  }, [snapshot.data?.attendance]);

  const latestPayroll = useMemo(() => (snapshot.data?.payroll || [])[0], [snapshot.data?.payroll]);

  const pendingLeaves = useMemo(
    () => (snapshot.data?.leaves || []).filter((row) => String(row.status || "").toUpperCase() === "PENDING"),
    [snapshot.data?.leaves],
  );

  const openAdvances = useMemo(
    () =>
      (snapshot.data?.advances || []).filter((row) => {
        const status = String(row.status || "").toUpperCase();
        const balance = Number(row.balance || 0);
        return (status === "APPROVED" || status === "PARTIAL") && balance > 0;
      }),
    [snapshot.data?.advances],
  );

  const openAdvanceBalance = useMemo(
    () => openAdvances.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    [openAdvances],
  );

  const timelineRows = useMemo(() => {
    const attendanceItems = (snapshot.data?.attendance || []).slice(0, 8).map((row, index) => ({
      id: `attendance-${String(row.id || index)}`,
      type: "Attendance",
      title: row.timeOut ? "Clock Out" : "Clock In",
      at: row.timeOut || row.timeIn || row.createdAt || null,
      detail: row.locationOut || row.locationIn || row.source || "-",
      status: row.timeOut ? "DONE" : "OPEN",
    }));

    const leaveItems = (snapshot.data?.leaves || []).slice(0, 8).map((row, index) => ({
      id: `leave-${String(row.id || index)}`,
      type: "Leave",
      title: humanize(String(row.leaveType || "Leave")),
      at: row.createdAt || row.startDate || null,
      detail: `${formatCell(row.startDate, "date")} - ${formatCell(row.endDate, "date")}`,
      status: String(row.status || "PENDING"),
    }));

    const payrollItems = (snapshot.data?.payroll || []).slice(0, 8).map((row, index) => ({
      id: `payroll-${String(row.id || index)}`,
      type: "Payroll",
      title: "Payroll Run",
      at: row.payrollDate || null,
      detail: formatCell(row.netAmountPaid, "currency"),
      status: String(row.status || "DRAFT"),
    }));

    const advanceItems = (snapshot.data?.advances || []).slice(0, 8).map((row, index) => ({
      id: `advance-${String(row.id || index)}`,
      type: "Loan",
      title: String(row.type || "Cash Advance"),
      at: row.dateIssued || null,
      detail: `Balance ${formatCell(row.balance, "currency")}`,
      status: String(row.status || "PENDING"),
    }));

    return [...attendanceItems, ...leaveItems, ...payrollItems, ...advanceItems]
      .filter((row) => row.at)
      .sort((a, b) => new Date(String(b.at)).getTime() - new Date(String(a.at)).getTime())
      .slice(0, 12);
  }, [snapshot.data?.advances, snapshot.data?.attendance, snapshot.data?.leaves, snapshot.data?.payroll]);

  if (snapshot.isLoading) {
    return <EmployeePageLoadingSkeleton />;
  }

  if (snapshot.isError) {
    return <EmployeeErrorState message={(snapshot.error as Error).message || "Unable to load dashboard."} />;
  }

  const profile = snapshot.data?.profile;
  const leaveBalance = snapshot.data?.leaveBalance;

  return (
    <section className="w-full space-y-5">
      <EmployeePageIntro
        title="My Dashboard"
        description="See your attendance today, leave standing, latest payroll, and outstanding advances in one place."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeStatCard
          label="Attendance Today"
          value={String(todayAttendance.length)}
          hint={todayAttendance.some((row) => !row.timeOut) ? "You still have an open clock entry." : "All captured logs are closed."}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="Pending Leaves"
          value={String(pendingLeaves.length)}
          hint="Requests waiting for approval."
          icon={<PlaneTakeoff className="h-4 w-4" />}
          tone={pendingLeaves.length ? "amber" : "green"}
        />
        <EmployeeStatCard
          label="Open Advances"
          value={formatCell(openAdvanceBalance, "currency")}
          hint={`${openAdvances.length} active advance record(s).`}
          icon={<Landmark className="h-4 w-4" />}
          tone={openAdvanceBalance > 0 ? "amber" : "green"}
        />
        <EmployeeStatCard
          label="Latest Payroll"
          value={latestPayroll ? formatCell(latestPayroll.netAmountPaid, "currency") : "-"}
          hint={latestPayroll ? `Status: ${humanize(String(latestPayroll.status || "DRAFT"))}` : "No payroll run yet."}
          icon={<ReceiptText className="h-4 w-4" />}
          tone={latestPayroll ? "green" : "slate"}
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <EmployeeSection title="Profile Summary" icon={<UserRound className="h-4 w-4 text-brand-600" />}>
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Employee</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "-"}
              </p>
              <p className="mt-1 text-xs text-slate-500">ID: {profile?.employeeCode || "-"}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Employment</p>
              <div className="mt-1">
                <StatusBadge value={profile?.status || "INACTIVE"} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{profile?.position || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Store</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{profile?.store?.area || profile?.store?.name || "-"}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Leave Balance</p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                VL {leaveBalance?.VL.remaining ?? 0} | SL {leaveBalance?.SL.remaining ?? 0}
              </p>
            </div>
          </div>
        </EmployeeSection>

        <EmployeeSection
          title="Recent Activity"
          icon={<Activity className="h-4 w-4 text-brand-600" />}
          subtitle={`${timelineRows.length} recent item(s)`}
        >
          <EmployeeTable
            columns={[
              {
                key: "title",
                label: "Activity",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-ink">{String(row.title || "-")}</p>
                    <p className="text-xs text-slate-500">{String(row.type || "-")}</p>
                  </div>
                ),
              },
              { key: "at", label: "Date", render: (row) => formatCell(row.at, "datetime") },
              { key: "detail", label: "Details", render: (row) => String(row.detail || "-"), hideOnMobile: true },
              { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            ]}
            rows={timelineRows as Array<Record<string, unknown>>}
            emptyLabel="No recent activity to show."
            renderCardTitle={(row) => String(row.title || "-")}
            renderCardMeta={(row) => formatCell(row.at, "date")}
            mobilePriorityKeys={["status", "at", "detail"]}
            mobileFieldLimit={3}
          />
        </EmployeeSection>
      </section>
    </section>
  );
}
