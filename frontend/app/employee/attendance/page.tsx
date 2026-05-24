"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, Filter, MapPin, Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { getMyAttendance, type AttendanceRecord } from "@/lib/api";
import { formatCell, humanize } from "@/lib/formatters";
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

export default function EmployeeAttendancePage() {
  const today = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return year && month && day ? `${year}-${month}-${day}` : "";
  }, []);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const attendanceQuery = useQuery({
    queryKey: ["employee", "attendance", fromDate, toDate],
    queryFn: () => getMyAttendance({ from: fromDate || undefined, to: toDate || undefined }),
  });

  const rows = useMemo(() => attendanceQuery.data || [], [attendanceQuery.data]);

  const openRows = useMemo(() => rows.filter((row) => row.timeIn && !row.timeOut), [rows]);
  const closedRows = useMemo(() => rows.filter((row) => row.timeIn && row.timeOut), [rows]);
  const remoteClockRows = useMemo(
    () => rows.filter((row) => String(row.source || "").toUpperCase() === "REMOTE_CLOCK"),
    [rows],
  );

  const totalWorkedHours = useMemo(() => {
    let minutes = 0;
    for (const row of closedRows) {
      if (!row.timeIn || !row.timeOut) continue;
      const inTime = new Date(row.timeIn).getTime();
      const outTime = new Date(row.timeOut).getTime();
      if (Number.isNaN(inTime) || Number.isNaN(outTime) || outTime <= inTime) continue;
      minutes += Math.floor((outTime - inTime) / 60_000);
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }, [closedRows]);

  function setRecentWindow(days: number) {
    const now = new Date();
    const end = formatDateInput(now);
    const start = formatDateInput(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
    setFromDate(start);
    setToDate(end);
  }

  if (attendanceQuery.isLoading) {
    return <EmployeePageLoadingSkeleton />;
  }

  if (attendanceQuery.isError) {
    return <EmployeeErrorState message={(attendanceQuery.error as Error).message || "Unable to load attendance."} />;
  }

  return (
    <section className="w-full space-y-5">
      <EmployeePageIntro
        title="My Attendance"
        description="Review your daily clock records, location logs, and open time entries."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeStatCard
          label="Total Logs"
          value={String(rows.length)}
          hint="Entries for selected period."
          icon={<Clock3 className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="Open Time-Out"
          value={String(openRows.length)}
          hint="Requires time-out completion."
          icon={<Timer className="h-4 w-4" />}
          tone={openRows.length ? "amber" : "green"}
        />
        <EmployeeStatCard
          label="Closed Records"
          value={String(closedRows.length)}
          hint="Complete in-and-out entries."
          icon={<CalendarDays className="h-4 w-4" />}
          tone="green"
        />
        <EmployeeStatCard
          label="Worked Hours"
          value={totalWorkedHours}
          hint="Based on closed records."
          icon={<Clock3 className="h-4 w-4" />}
          tone="brand"
        />
      </section>

      <EmployeeSection
        title="Attendance Log"
        icon={<Filter className="h-4 w-4 text-brand-600" />}
        subtitle={`${remoteClockRows.length} from remote clock`}
      >
        <div className="flex flex-col gap-3 border-b border-line px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">From</span>
            <Input type="date" className="h-10 w-full sm:w-[170px]" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">To</span>
            <Input type="date" className="h-10 w-full sm:w-[170px]" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="h-10 px-3" onClick={() => setRecentWindow(7)}>
              Last 7 days
            </Button>
            <Button variant="secondary" className="h-10 px-3" onClick={() => setRecentWindow(30)}>
              Last 30 days
            </Button>
            <Button variant="ghost" className="h-10 px-3" onClick={() => { setFromDate(today); setToDate(today); }}>
              Today
            </Button>
          </div>
        </div>

          <EmployeeTable
            columns={[
            {
              key: "timeIn",
              label: "Time In",
              render: (row) => formatCell(row.timeIn || row.createdAt, "datetime"),
            },
            {
              key: "timeOut",
              label: "Time Out",
              render: (row) => (row.timeOut ? formatCell(row.timeOut, "datetime") : "-"),
            },
            {
              key: "worked",
              label: "Worked",
              render: (row) => computeWorkedHours(row as AttendanceRecord),
            },
            {
              key: "location",
              label: "Location",
              hideOnMobile: true,
              render: (row) => (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="line-clamp-2 max-w-[360px]">{String(row.locationIn || row.locationOut || "-")}</span>
                </div>
              ),
            },
            {
              key: "source",
              label: "Source",
              render: (row) => <StatusBadge value={row.source || "REMOTE_CLOCK"} />,
            },
            {
              key: "status",
              label: "Entry",
              render: (row) =>
                row.timeOut ? (
                  <StatusBadge value="DONE" />
                ) : (
                  <StatusBadge value="OPEN" />
                ),
            },
          ]}
            rows={rows as Array<Record<string, unknown>>}
            emptyLabel="No attendance records found for selected dates."
            renderCardTitle={(row) => formatCell(row.timeIn || row.createdAt, "datetime")}
            renderCardMeta={(row) => humanize(String(row.source || "REMOTE_CLOCK"))}
            mobilePriorityKeys={["status", "timeOut", "worked", "source"]}
            mobileFieldLimit={4}
          />
        </EmployeeSection>
      </section>
  );
}

function formatDateInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
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

function computeWorkedHours(row: AttendanceRecord) {
  if (!row.timeIn || !row.timeOut) return "-";
  const start = new Date(row.timeIn).getTime();
  const end = new Date(row.timeOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "-";
  const minutes = Math.floor((end - start) / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
