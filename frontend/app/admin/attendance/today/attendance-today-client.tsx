"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, RefreshCw, Search, X } from "lucide-react";

import { ResourcePage } from "@/components/resource/resource-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listResource } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { attendanceResource } from "@/lib/resources";

type NoTimeInRecord = {
  employeeId?: number;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  storeArea?: string | null;
  scheduleStartTime?: string | null;
  scheduleEndTime?: string | null;
  scheduleCount?: number;
};

export function AttendanceTodayClient() {
  const [noTimeInOpen, setNoTimeInOpen] = useState(false);

  return (
    <>
      <ResourcePage
        config={{
          ...attendanceResource,
          title: "Today Attendance",
          description: "Scan today's employee time-in and time-out logs with clock-in and clock-out locations.",
          searchPlaceholder: "Search employee ID, first name, last name, location",
          emptyLabel: "No attendance logs found for today (Asia/Manila time).",
          columns: [
            { key: "employee.employeeCode", header: "ID" },
            { key: "employee.firstName", header: "First Name" },
            { key: "employee.lastName", header: "Last Name" },
            { key: "timeIn", header: "Time In", type: "datetime" },
            { key: "locationIn", header: "Location In", hideOnMobile: true },
            { key: "timeInImage", header: "Time In Image", type: "image", hideOnMobile: true },
            { key: "timeOut", header: "Time Out", type: "datetime" },
            { key: "locationOut", header: "Location Out", hideOnMobile: true },
            { key: "timeOutImage", header: "Time Out Image", type: "image", hideOnMobile: true }
          ]
        }}
        endpointOverride="attendance/today"
        scope="all"
        allowCreate={false}
        allowEdit={false}
        allowDelete={false}
        toolbarActions={
          <Button
            variant="secondary"
            className="h-10 w-full rounded-md px-4 sm:w-auto"
            icon={<Clock3 className="h-4 w-4" />}
            onClick={() => setNoTimeInOpen(true)}
          >
            No Time-in
          </Button>
        }
      />

      <NoTimeInModal open={noTimeInOpen} onClose={() => setNoTimeInOpen(false)} />
    </>
  );
}

function NoTimeInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const query = useQuery({
    queryKey: ["attendance", "no-timein"],
    queryFn: () => listResource<NoTimeInRecord>("attendance/no-timein"),
    enabled: open,
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const records = query.data || [];
    const term = search.trim().toLowerCase();
    if (!term) return records;

    return records.filter((row) =>
      [
        row.employeeCode,
        row.firstName,
        row.lastName,
        row.fullName,
        row.storeArea,
      ]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [query.data, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/35 p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="No Time In">
      <div className="mx-auto flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden border-[1.5px] border-line bg-field shadow-overlay">
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-3 py-2.5 sm:px-4 sm:py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-600">Attendance</p>
            <h3 className="font-slab text-xl font-bold text-ink sm:text-2xl">No Time In</h3>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            aria-label="Close no time in modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b-[1.5px] border-line/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <label className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-md border-line bg-white pl-9 text-[15px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee code, name, store area"
            />
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-10 rounded-md px-3"
              icon={<RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />}
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              Refresh
            </Button>
            <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs text-slate-600">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          {query.isLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">Loading no time-in records...</div>
          ) : query.isError ? (
            <div className="border-l-[4px] border-signal-red bg-red-50 p-4 text-sm text-signal-red">
              {(query.error as Error).message || "Unable to load no time-in records."}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No scheduled employees without time-in at the moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="rounded-l-md border border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">ID</th>
                    <th className="border-y border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Employee Name</th>
                    <th className="border-y border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Store Area</th>
                    <th className="border-y border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Start Time</th>
                    <th className="rounded-r-md border border-line bg-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.employeeId || row.employeeCode || "employee"}-${row.scheduleStartTime || row.scheduleEndTime || ""}`} className="hover:bg-slate-50/70">
                      <td className="border-b border-line px-3 py-2 text-slate-700">{row.employeeCode || "-"}</td>
                      <td className="border-b border-line px-3 py-2 text-slate-700">{row.fullName || [row.firstName, row.lastName].filter(Boolean).join(" ") || "-"}</td>
                      <td className="border-b border-line px-3 py-2 text-slate-700">{row.storeArea || "-"}</td>
                      <td className="border-b border-line px-3 py-2 text-slate-700">
                        {row.scheduleStartTime ? formatDate(row.scheduleStartTime, "h:mm a") : "-"}
                      </td>
                      <td className="border-b border-line px-3 py-2 text-slate-700">
                        {row.scheduleEndTime ? formatDate(row.scheduleEndTime, "h:mm a") : "-"}
                      </td>
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
