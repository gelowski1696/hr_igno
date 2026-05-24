"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarClock,
  ChevronDown,
  Clock3,
  Columns3,
  HandCoins,
  MapPin,
  PlaneTakeoff,
  ShieldAlert,
  TrendingUp,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDashboardSnapshot, type DashboardSnapshot } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { formatCell, getValueByPath, humanize } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

const metrics = [
  { key: "activeEmployees", label: "Active Employees", hint: "Currently active", icon: UsersRound },
  { key: "attendanceToday", label: "Attendance", hint: "Logged today", icon: Clock3 },
  { key: "pendingLeaves", label: "Leave Requests", hint: "Waiting review", icon: PlaneTakeoff },
  { key: "payrollDrafts", label: "Payroll Drafts", hint: "Needs final check", icon: Banknote },
  { key: "pendingAdvances", label: "Cash Advances", hint: "Pending status", icon: WalletCards }
] as const;

const dashboardColumns = [
  { key: "employee", label: "Employee" },
  { key: "timeIn", label: "Time in" },
  { key: "location", label: "Location" },
  { key: "source", label: "Source" }
] as const;

type DashboardColumnKey = (typeof dashboardColumns)[number]["key"];
type DashboardColumnVisibility = Record<DashboardColumnKey, boolean>;

type TrendPoint = {
  label: string;
  count: number;
  key: string;
};

type WorkloadEntry = {
  label: string;
  hint: string;
  count: number;
};

type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
  kind: "attendance" | "leave" | "payroll" | "cashAdvance";
};

const defaultDashboardColumnVisibility: DashboardColumnVisibility = {
  employee: true,
  timeIn: true,
  location: true,
  source: true
};

export function AdminDashboard() {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<DashboardColumnVisibility>(defaultDashboardColumnVisibility);
  const [exceptionSearch, setExceptionSearch] = useState("");
  const storageKey = "dashboard-exceptions-columns";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<DashboardColumnKey, unknown>>;
      setColumnVisibility({
        employee: parsed.employee === false ? false : true,
        timeIn: parsed.timeIn === false ? false : true,
        location: parsed.location === false ? false : true,
        source: parsed.source === false ? false : true
      });
    } catch {
      setColumnVisibility(defaultDashboardColumnVisibility);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const snapshot = useQuery({
    queryKey: ["dashboard", "snapshot"],
    queryFn: getDashboardSnapshot
  });

  const visibleColumns = useMemo(
    () => dashboardColumns.filter((column) => columnVisibility[column.key]),
    [columnVisibility]
  );

  const visibleColumnCount = visibleColumns.length;

  const recentExceptions = useMemo(
    () => ((snapshot.data?.recentExceptions || []) as Record<string, unknown>[]),
    [snapshot.data?.recentExceptions]
  );

  const filteredExceptions = useMemo(() => {
    const term = exceptionSearch.trim().toLowerCase();
    if (!term) return recentExceptions;
    return recentExceptions.filter((row) => buildExceptionSearchBlob(row).includes(term));
  }, [exceptionSearch, recentExceptions]);

  const sourceBreakdown = useMemo(() => summarizeBySource(recentExceptions), [recentExceptions]);
  const locationHotspots = useMemo(() => summarizeByLocation(recentExceptions), [recentExceptions]);
  const trendPoints = useMemo(() => buildAttendanceTrend(snapshot.data?.attendanceRows || []), [snapshot.data?.attendanceRows]);
  const workload = useMemo(() => buildWorkload(snapshot.data), [snapshot.data]);
  const timeline = useMemo(() => buildTimeline(snapshot.data), [snapshot.data]);

  function toggleColumn(key: DashboardColumnKey) {
    setColumnVisibility((previous) => {
      if (previous[key] && visibleColumnCount <= 1) {
        return previous;
      }
      return { ...previous, [key]: !previous[key] };
    });
  }

  if (snapshot.isLoading) {
    return (
      <section className="w-full space-y-5">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </section>
    );
  }

  if (snapshot.isError) {
    return (
      <section className="w-full border-[1.5px] border-signal-red bg-red-50 p-5 text-sm font-medium text-signal-red">
        {(snapshot.error as Error).message || "Dashboard data could not be loaded."}
      </section>
    );
  }

  const data = snapshot.data;

  return (
    <section className="w-full space-y-6">
      <header className="border-b-[1.5px] border-line pb-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Operations</p>
            <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">Daily Overview</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track staffing, attendance flow, pending approvals, and live exceptions.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:min-w-[280px] sm:grid-cols-2 sm:gap-3 sm:text-right">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Workspace</p>
              <p className="mt-1 font-semibold text-ink">{APP_NAME}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Data status</p>
              <p className="mt-1 font-semibold text-ink">Live now</p>
            </div>
          </div>
        </div>
      </header>

      <section className="border-[1.5px] border-line bg-white">
        <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const value = String(data?.[metric.key as keyof typeof data] ?? 0);
            return (
              <div key={metric.key} className="px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{metric.label}</dt>
                <dd className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-slab text-3xl font-bold leading-none text-ink">{value}</span>
                  <Icon className="h-4 w-4 text-brand-700" />
                </dd>
                <p className="mt-2 text-xs text-slate-500">{metric.hint}</p>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <TrendPanel points={trendPoints} />
            <WorkloadPanel workload={workload} />
          </div>

          <section className="border-[1.5px] border-line bg-white">
            <div className="flex flex-col gap-3 border-b-[1.5px] border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-signal-amber" />
                <h3 className="text-sm font-bold text-ink">Open Attendance Exceptions</h3>
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <label className="min-w-0 w-full sm:w-[300px] sm:flex-none">
                  <Input
                    className="h-9 rounded-md border-line text-sm"
                    placeholder="Search employee, location, source"
                    value={exceptionSearch}
                    onChange={(event) => setExceptionSearch(event.target.value)}
                  />
                </label>
                <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs text-slate-600">
                  {filteredExceptions.length} rows
                </span>
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto sm:justify-start"
                    onClick={() => setColumnMenuOpen((open) => !open)}
                  >
                    <Columns3 className="h-4 w-4" />
                    Columns
                    <ChevronDown className={`h-4 w-4 transition ${columnMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {columnMenuOpen ? (
                    <div className="absolute right-0 top-10 z-20 w-56 rounded-md border border-line bg-white p-3 shadow-lg">
                      <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Visible columns</p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand-600 hover:underline"
                          onClick={() => setColumnVisibility(defaultDashboardColumnVisibility)}
                        >
                          Reset
                        </button>
                      </div>
                      <div className="space-y-2">
                        {dashboardColumns.map((column) => {
                          const checked = columnVisibility[column.key];
                          const disableToggle = checked && visibleColumnCount <= 1;
                          return (
                            <label key={column.key} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-line accent-[#0051d5]"
                                checked={checked}
                                disabled={disableToggle}
                                onChange={() => toggleColumn(column.key)}
                              />
                              <span className={disableToggle ? "text-slate-400" : ""}>{column.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {filteredExceptions.length ? (
              <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
                <table className="min-w-[720px] w-full border-separate border-spacing-0 text-left text-sm lg:min-w-[900px]">
                  <thead>
                    <tr>
                      {visibleColumns.map((column, index) => (
                        <th
                          key={column.key}
                          className={[
                            "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
                            index === 0 ? "rounded-l-md border-l" : "",
                            index === visibleColumns.length - 1 ? "rounded-r-md border-r" : "border-r-0"
                          ].join(" ")}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExceptions.map((row, index) => (
                      <tr key={`${String(row.id ?? index)}`} className="transition hover:bg-slate-50/70">
                        {visibleColumns.map((column) => (
                          <td key={column.key} className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                            {renderDashboardCell(column.key, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm text-slate-600">No open no-timeout rows match the current search.</div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border-[1.5px] border-line bg-white">
            <div className="flex items-center gap-2 border-b-[1.5px] border-line px-4 py-3">
              <Activity className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-bold text-ink">Live Activity Timeline</h3>
            </div>

            {timeline.length ? (
              <ol className="px-4 py-4">
                {timeline.map((item, index) => (
                  <li key={item.id} className="relative pb-4 pl-8 last:pb-0">
                    {index < timeline.length - 1 ? <span className="absolute left-[10px] top-6 h-[calc(100%-8px)] w-px bg-line" /> : null}
                    <span className={`absolute left-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${timelineBadgeClass(item.kind)}`}>
                      {timelineIcon(item.kind)}
                    </span>
                    <div className="rounded-md border border-line/70 bg-muted px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <span className="text-xs text-slate-500">{formatCell(item.at, "datetime")}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-4 text-sm text-slate-500">No recent activity yet.</p>
            )}
          </section>

          <section className="border-[1.5px] border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-signal-amber" />
              <h3 className="text-sm font-bold text-ink">Attention List</h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Open exceptions</p>
                <p className="mt-1 font-slab text-3xl font-bold leading-none text-ink">{recentExceptions.length}</p>
                <p className="mt-1 text-xs text-slate-500">These records still need a matching clock-out.</p>
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">By source</p>
                {sourceBreakdown.length ? (
                  <ul className="mt-2 space-y-2">
                    {sourceBreakdown.map((entry) => (
                      <li key={entry.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{entry.label}</span>
                        <StatusBadge value={`${entry.count}`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No source data available.</p>
                )}
              </div>

              <div className="border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Frequent locations</p>
                {locationHotspots.length ? (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {locationHotspots.map((spot) => (
                      <li key={spot.label} className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2">{spot.label}</span>
                        <span className="font-semibold text-ink">{spot.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No location data available.</p>
                )}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}

function TrendPanel({ points }: { points: TrendPoint[] }) {
  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 40 - (point.count / maxCount) * 32;
    return { ...point, x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x} 40 L ${coordinates[0].x} 40 Z`
    : "";

  return (
    <section className="border-[1.5px] border-line bg-white">
      <div className="flex items-center gap-2 border-b-[1.5px] border-line px-4 py-3">
        <TrendingUp className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-ink">Attendance Trend</h3>
      </div>
      <div className="p-4">
        {points.length ? (
          <>
            <div className="h-44 border border-line/70 bg-muted px-3 py-2">
              <svg viewBox="0 0 100 44" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
                <path d="M 0 40 L 100 40" stroke="#cbd5e1" strokeWidth="0.8" />
                {areaPath ? <path d={areaPath} fill="#dbeafe" opacity="0.6" /> : null}
                {linePath ? <path d={linePath} fill="none" stroke="#1E40AF" strokeWidth="1.4" /> : null}
                {coordinates.map((point) => (
                  <circle key={point.key} cx={point.x} cy={point.y} r="1.8" fill="#1E3A8A" />
                ))}
              </svg>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-600" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
              {points.map((point) => (
                <div key={point.key} className="space-y-0.5 text-center">
                  <p className="font-semibold text-ink">{point.count}</p>
                  <p>{point.label}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">No attendance data to render yet.</p>
        )}
      </div>
    </section>
  );
}

function WorkloadPanel({ workload }: { workload: WorkloadEntry[] }) {
  const maxCount = Math.max(...workload.map((entry) => entry.count), 1);

  return (
    <section className="border-[1.5px] border-line bg-white">
      <div className="flex items-center gap-2 border-b-[1.5px] border-line px-4 py-3">
        <CalendarClock className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-ink">Pending Workload</h3>
      </div>
      <div className="space-y-3 p-4">
        {workload.map((entry) => (
          <div key={entry.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{entry.label}</p>
              <p className="text-sm font-semibold text-slate-600">{entry.count}</p>
            </div>
            <div className="h-2 overflow-hidden bg-slate-100">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.max((entry.count / maxCount) * 100, entry.count > 0 ? 12 : 0)}%` }} />
            </div>
            <p className="text-xs text-slate-500">{entry.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderDashboardCell(column: DashboardColumnKey, row: Record<string, unknown>) {
  if (column === "employee") {
    const employee = asRecord(row.employee);
    const fullName = [asString(getValueByPath(row, "employee.firstName")), asString(getValueByPath(row, "employee.lastName"))]
      .filter(Boolean)
      .join(" ");
    const code = asString(employee?.employeeCode) || asString(row.employeeId);
    return (
      <div>
        <p className="font-semibold text-ink">{fullName || "-"}</p>
        {code ? <p className="text-xs text-slate-500">Code: {code}</p> : null}
      </div>
    );
  }
  if (column === "timeIn") {
    return (
      <div>
        <p className="font-medium text-ink">{formatCell(row.timeIn, "datetime")}</p>
        <p className="text-xs text-slate-500">Waiting for clock-out</p>
      </div>
    );
  }
  if (column === "location") {
    return (
      <div className="flex items-start gap-1.5">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="line-clamp-2">{formatCell(row.locationIn)}</span>
      </div>
    );
  }
  return <StatusBadge value={row.source} />;
}

function summarizeBySource(rows: Record<string, unknown>[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const source = String(row.source || "Unknown").trim() || "Unknown";
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label: label.replace(/_/g, " "), count }))
    .sort((a, b) => b.count - a.count);
}

function summarizeByLocation(rows: Record<string, unknown>[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = String(row.locationIn || "").trim();
    if (!raw) continue;
    const normalized = raw.length > 56 ? `${raw.slice(0, 56)}...` : raw;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildExceptionSearchBlob(row: Record<string, unknown>) {
  const employee = asRecord(row.employee);
  const parts = [
    row.id,
    row.source,
    row.locationIn,
    row.employeeId,
    employee?.employeeCode,
    employee?.firstName,
    employee?.middleName,
    employee?.lastName
  ];

  return parts
    .map((value) => asString(value))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildAttendanceTrend(rows: Record<string, unknown>[]): TrendPoint[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const parsed = parseDate(row.timeIn) || parseDate(row.createdAt);
    if (!parsed) continue;
    const key = isoDayKey(parsed);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([key, count]) => ({
      key,
      count,
      label: shortDayLabel(key)
    }));
}

function buildWorkload(snapshot?: DashboardSnapshot): WorkloadEntry[] {
  if (!snapshot) {
    return [];
  }

  return [
    {
      label: "Attendance exceptions",
      hint: "Clock-ins waiting for clock-out",
      count: snapshot.recentExceptions.length
    },
    {
      label: "Leave approvals",
      hint: "Pending leave requests",
      count: snapshot.pendingLeaves
    },
    {
      label: "Payroll finalization",
      hint: "Draft or preview payroll runs",
      count: snapshot.payrollDrafts
    },
    {
      label: "Cash advance review",
      hint: "Advances waiting payment action",
      count: snapshot.pendingAdvances
    }
  ];
}

function buildTimeline(snapshot?: DashboardSnapshot): TimelineItem[] {
  if (!snapshot) return [];

  const attendanceItems = snapshot.attendanceRows
    .slice(0, 40)
    .map((row, index) => {
      const at = asString(row.timeOut) || asString(row.timeIn) || asString(row.createdAt);
      const employee = asRecord(row.employee);
      const title = `${employeeDisplayName(employee) || "Employee"} ${row.timeOut ? "clocked out" : "clocked in"}`;
      const location = asString(row.locationOut) || asString(row.locationIn) || "No location";
      const source = humanize(asString(row.source) || "REMOTE_CLOCK");
      return {
        id: `attendance-${String(row.id || index)}`,
        title,
        detail: `${source} - ${location}`,
        at,
        kind: "attendance" as const
      };
    })
    .filter((item) => Boolean(item.at));

  const leaveItems = snapshot.leaveRows.slice(0, 20).map((row, index) => {
    const employee = asRecord(row.employee);
    const leaveType = humanize(asString(row.leaveType) || "Leave");
    const status = humanize(asString(row.status) || "PENDING");
    return {
      id: `leave-${String(row.id || index)}`,
      title: `${employeeDisplayName(employee) || "Employee"} filed ${leaveType}`,
      detail: `Status: ${status}`,
      at: asString(row.updatedAt) || asString(row.createdAt) || asString(row.startDate),
      kind: "leave" as const
    };
  });

  const payrollItems = snapshot.payrollRows.slice(0, 20).map((row, index) => {
    const employee = asRecord(row.employee);
    const status = humanize(asString(row.status) || "DRAFT");
    const totalAmount = formatCell(row.totalAmount, "currency");
    return {
      id: `payroll-${String(row.id || index)}`,
      title: `${employeeDisplayName(employee) || "Employee"} payroll updated`,
      detail: `${status} - ${totalAmount}`,
      at: asString(row.updatedAt) || asString(row.payrollDate) || asString(row.createdAt),
      kind: "payroll" as const
    };
  });

  const advanceItems = snapshot.cashAdvanceRows.slice(0, 20).map((row, index) => {
    const employee = asRecord(row.employee);
    const status = humanize(asString(row.status) || "PENDING");
    const amount = formatCell(row.amount, "currency");
    return {
      id: `advance-${String(row.id || index)}`,
      title: `${employeeDisplayName(employee) || "Employee"} cash advance activity`,
      detail: `${status} - ${amount}`,
      at: asString(row.updatedAt) || asString(row.dateIssued) || asString(row.createdAt),
      kind: "cashAdvance" as const
    };
  });

  return [...attendanceItems, ...leaveItems, ...payrollItems, ...advanceItems]
    .filter((item) => parseDate(item.at))
    .sort((a, b) => {
      const aTs = parseDate(a.at)?.getTime() || 0;
      const bTs = parseDate(b.at)?.getTime() || 0;
      return bTs - aTs;
    })
    .slice(0, 12);
}

function timelineIcon(kind: TimelineItem["kind"]) {
  if (kind === "attendance") {
    return <Clock3 className="h-3 w-3 text-brand-700" />;
  }
  if (kind === "leave") {
    return <PlaneTakeoff className="h-3 w-3 text-signal-amber" />;
  }
  if (kind === "payroll") {
    return <Banknote className="h-3 w-3 text-signal-green" />;
  }
  return <HandCoins className="h-3 w-3 text-signal-blue" />;
}

function timelineBadgeClass(kind: TimelineItem["kind"]) {
  if (kind === "attendance") {
    return "bg-brand-100";
  }
  if (kind === "leave") {
    return "bg-amber-100";
  }
  if (kind === "payroll") {
    return "bg-emerald-100";
  }
  return "bg-blue-100";
}

function asRecord(value: unknown) {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function isoDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortDayLabel(dayKey: string) {
  const parts = dayKey.split("-");
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[monthIndex] || parts[1];
  return `${month} ${day}`;
}

function employeeDisplayName(employee: Record<string, unknown> | undefined) {
  if (!employee) return "";
  const fullName = [asString(employee.firstName), asString(employee.lastName)].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return asString(employee.employeeCode);
}
