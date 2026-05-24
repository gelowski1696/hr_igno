"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users2,
  X
} from "lucide-react";
import { clsx } from "clsx";

import { apiFetch, createResource, deleteResource, listResource, updateResource } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

type ScheduleTemplate = {
  id: number;
  name: string;
  description?: string | null;
  workDay?: string | null;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  duration?: number | string | null;
  breakDuration?: number | string | null;
};

type EmployeeRow = {
  id: number;
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  store?: { area?: string | null; code?: string | null } | null;
};

type EmployeeGroupMember = {
  employeeId: number;
  employee?: {
    id: number;
  } | null;
};

type EmployeeGroupRow = {
  id: number;
  name: string;
  memberCount?: number;
  memberIdsCsv?: string;
  members?: EmployeeGroupMember[];
};

type ScheduleAssignment = {
  employeeId: number;
  employee?: {
    id: number;
    employeeCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type WorkSchedule = {
  id: number;
  shiftName: string;
  workDay: string;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  duration?: number | string | null;
  breakDuration?: number | string | null;
  status: string;
  notes?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceEnd?: string | null;
  recurrenceDays?: string | null;
  employees?: ScheduleAssignment[];
};

type CalendarScheduleEntry = {
  id: string;
  scheduleId: number;
  shiftName: string;
  status: string;
  startTime: string;
  endTime: string;
};

type CompactScheduleListRow = {
  id: string;
  compact: true;
  shiftName: string;
  status: string;
  recurrenceType: RecurrenceType;
  recurrenceDays?: string | null;
  workDays: string[];
  startClock: string;
  endClock: string;
  rangeStart: string;
  rangeEnd: string;
  occurrences: number;
  employeeAssignments: number;
  notes?: string | null;
};

type ScheduleListRow = WorkSchedule | CompactScheduleListRow;

type ConflictWarning = {
  employeeId: number;
  date: string;
  type: "DUPLICATE" | "OVERLAP" | "MISSING_REST_DAY" | "MISSING_EMPLOYEE";
  message: string;
};

type BulkPreviewResponse = {
  apply: boolean;
  created: number;
  skipped: number;
  previewCount: number;
  warnings: ConflictWarning[];
  generated?: Array<{
    dateKey: string;
    workDay: string;
    startTime: string;
    endTime: string;
    shiftName: string;
  }>;
};

type ToastMessage = {
  id: number;
  type: "success" | "error";
  text: string;
};

type ScheduleFormState = {
  templateId: string;
  shiftName: string;
  scheduleDate: string;
  startClock: string;
  endClock: string;
  breakStartClock: string;
  breakEndClock: string;
  duration: string;
  breakDuration: string;
  status: string;
  notes: string;
  recurrenceType: RecurrenceType;
  recurrenceEnd: string;
  recurrenceDays: string[];
  employeeIds: number[];
};

type BulkFormState = {
  templateId: string;
  shiftName: string;
  dateFrom: string;
  dateTo: string;
  recurrenceType: RecurrenceType;
  recurrenceDays: string[];
  startClock: string;
  endClock: string;
  breakStartClock: string;
  breakEndClock: string;
  duration: string;
  breakDuration: string;
  status: string;
  notes: string;
  employeeIds: number[];
};

type TableColumnId =
  | "shift"
  | "day"
  | "start"
  | "end"
  | "employees"
  | "recurrence"
  | "status"
  | "actions";

const recurrenceOptions: Array<{ label: string; value: RecurrenceType }> = [
  { label: "None", value: "NONE" },
  { label: "Daily", value: "DAILY" },
  { label: "Weekly", value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" }
];

const weekdayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const tableColumns: Array<{ id: TableColumnId; label: string; hideOnMobile?: boolean }> = [
  { id: "shift", label: "Shift" },
  { id: "day", label: "Work Day", hideOnMobile: true },
  { id: "start", label: "Start" },
  { id: "end", label: "End" },
  { id: "employees", label: "Employees", hideOnMobile: true },
  { id: "recurrence", label: "Recurrence", hideOnMobile: true },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" }
];

const defaultTableVisibility: Record<TableColumnId, boolean> = {
  shift: true,
  day: true,
  start: true,
  end: true,
  employees: true,
  recurrence: true,
  status: true,
  actions: true
};

export default function AttendanceSchedulesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"list" | "bulk" | "calendar">("list");
  const [listMode, setListMode] = useState<"compact" | "flat">("compact");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [calendarCursor, setCalendarCursor] = useState(() => startOfManilaDay(new Date()));
  const [isCalendarTransitioning, setIsCalendarTransitioning] = useState(false);
  const calendarTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<TableColumnId, boolean>>(defaultTableVisibility);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [singleEmployeeFinder, setSingleEmployeeFinder] = useState("");
  const [singleEmployeeGroupFilter, setSingleEmployeeGroupFilter] = useState("all");
  const [bulkEmployeeFinder, setBulkEmployeeFinder] = useState("");
  const [bulkEmployeeGroupFilter, setBulkEmployeeGroupFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTrack, setGuideTrack] = useState<"single" | "bulk">("single");
  const [singleWizardMode, setSingleWizardMode] = useState(false);
  const [singleWizardStep, setSingleWizardStep] = useState(1);
  const [bulkWizardMode, setBulkWizardMode] = useState(false);
  const [bulkWizardStep, setBulkWizardStep] = useState(1);

  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(buildDefaultScheduleForm);
  const [bulkForm, setBulkForm] = useState<BulkFormState>(buildDefaultBulkForm);
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewResponse | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["attendance", "schedules", listMode],
    queryFn: () => listResource<ScheduleListRow>(`schedules?mode=${listMode}&take=400`)
  });

  const calendarSchedulesQuery = useQuery({
    queryKey: ["attendance", "schedules", "calendar"],
    queryFn: () => fetchCalendarSchedules(),
    enabled: activeTab === "calendar"
  });

  const templatesQuery = useQuery({
    queryKey: ["attendance", "schedule-templates"],
    queryFn: () => listResource<ScheduleTemplate>("schedule-templates")
  });

  const employeesQuery = useQuery({
    queryKey: ["attendance", "employees"],
    queryFn: () => listResource<EmployeeRow>("employees")
  });

  const employeeGroupsQuery = useQuery({
    queryKey: ["attendance", "employee-groups"],
    queryFn: () => listResource<EmployeeGroupRow>("employee-groups")
  });

  const createSchedule = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createResource("schedules", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance", "schedules"] });
      setFormOpen(false);
      setScheduleForm(buildDefaultScheduleForm());
      pushToast(setToasts, "success", "Schedule saved.");
    },
    onError: (error: unknown) => {
      pushToast(setToasts, "error", toMessage(error, "Unable to save schedule."));
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateResource("schedules", id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance", "schedules"] });
      setEditingSchedule(null);
      setFormOpen(false);
      setScheduleForm(buildDefaultScheduleForm());
      pushToast(setToasts, "success", "Schedule updated.");
    },
    onError: (error: unknown) => {
      pushToast(setToasts, "error", toMessage(error, "Unable to update schedule."));
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => deleteResource("schedules", id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance", "schedules"] });
      setConfirmDeleteId(null);
      pushToast(setToasts, "success", "Schedule removed.");
    },
    onError: (error: unknown) => {
      pushToast(setToasts, "error", toMessage(error, "Unable to delete schedule."));
    }
  });

  const previewBulkMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<BulkPreviewResponse>("schedules/bulk/preview", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: (result) => {
      setBulkPreview(result);
      if (result.warnings.length) {
        pushToast(setToasts, "error", `Preview found ${result.warnings.length} conflict warning(s).`);
      } else {
        pushToast(setToasts, "success", "Preview generated with no conflicts.");
      }
    },
    onError: (error: unknown) => {
      pushToast(setToasts, "error", toMessage(error, "Unable to preview bulk schedule."));
    }
  });

  const applyBulkMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<BulkPreviewResponse>("schedules/bulk/apply", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["attendance", "schedules"] });
      setBulkPreview(result);
      pushToast(setToasts, "success", `Bulk assignment completed. Created ${result.created} schedule(s).`);
    },
    onError: (error: unknown) => {
      pushToast(setToasts, "error", toMessage(error, "Unable to apply bulk schedule."));
    }
  });

  const employees = useMemo(() => (employeesQuery.data || []).sort(sortEmployeeRows), [employeesQuery.data]);
  const employeeGroups = useMemo(() => (employeeGroupsQuery.data || []).sort(sortEmployeeGroups), [employeeGroupsQuery.data]);
  const templates = templatesQuery.data || [];
  const schedules = schedulesQuery.data || [];
  const isBulkDependenciesLoading =
    templatesQuery.isLoading || employeesQuery.isLoading || employeeGroupsQuery.isLoading;
  const isBulkDependenciesError =
    templatesQuery.isError || employeesQuery.isError || employeeGroupsQuery.isError;
  const bulkDependenciesErrorMessage = useMemo(() => {
    if (templatesQuery.isError) {
      return toMessage(templatesQuery.error, "Unable to load schedule templates.");
    }
    if (employeesQuery.isError) {
      return toMessage(employeesQuery.error, "Unable to load employees.");
    }
    if (employeeGroupsQuery.isError) {
      return toMessage(employeeGroupsQuery.error, "Unable to load employee groups.");
    }
    return "Unable to load bulk scheduling data.";
  }, [
    employeeGroupsQuery.error,
    employeeGroupsQuery.isError,
    employeesQuery.error,
    employeesQuery.isError,
    templatesQuery.error,
    templatesQuery.isError,
  ]);
  const employeesById = useMemo(() => {
    const map = new Map<number, EmployeeRow>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    return map;
  }, [employees]);
  const groupMemberIdsByGroupId = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const group of employeeGroups) {
      map.set(String(group.id), extractGroupMemberIds(group));
    }
    return map;
  }, [employeeGroups]);

  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return schedules;
    return schedules.filter((row) => {
      if (isCompactScheduleRow(row)) {
        return [
          row.shiftName,
          row.status,
          row.recurrenceType,
          row.recurrenceDays || "",
          row.workDays.join(" "),
          row.notes || ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      }

      const employeeNames = (row.employees || [])
        .map((assignment) => {
          const linked = employeesById.get(assignment.employeeId);
          if (assignment.employee) {
            const employee = assignment.employee;
            const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ");
            return `${employee.employeeCode || ""} ${name}`.trim();
          }
          return linked ? employeeLabel(linked) : `#${assignment.employeeId}`;
        })
        .join(" ");

      return [row.shiftName, row.workDay, row.status, row.recurrenceType || "", row.notes || "", employeeNames]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [employeesById, schedules, search]);

  const visibleColumns = tableColumns.filter((column) => {
    if (!columnVisibility[column.id]) return false;
    return true;
  });
  const pageCount = Math.max(Math.ceil(filteredSchedules.length / pageSize), 1);
  const pagedSchedules = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredSchedules.slice(start, start + pageSize);
  }, [filteredSchedules, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [search, listMode, pageSize]);

  useEffect(() => {
    setPageIndex((value) => {
      const maxIndex = Math.max(0, pageCount - 1);
      return value > maxIndex ? maxIndex : value;
    });
  }, [pageCount]);

  const filteredSingleEmployeeOptions = useMemo(
    () => filterEmployeesForAssignment(employees, groupMemberIdsByGroupId, singleEmployeeGroupFilter, singleEmployeeFinder),
    [employees, groupMemberIdsByGroupId, singleEmployeeGroupFilter, singleEmployeeFinder]
  );

  const filteredBulkEmployeeOptions = useMemo(
    () => filterEmployeesForAssignment(employees, groupMemberIdsByGroupId, bulkEmployeeGroupFilter, bulkEmployeeFinder),
    [employees, groupMemberIdsByGroupId, bulkEmployeeGroupFilter, bulkEmployeeFinder]
  );

  const calendarDays = useMemo(() => {
    if (calendarMode === "week") {
      const start = startOfWeekManila(calendarCursor);
      return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
    }

    const first = startOfMonthManila(calendarCursor);
    const gridStart = startOfWeekManila(first);
    return Array.from({ length: 42 }, (_, idx) => addDays(gridStart, idx));
  }, [calendarCursor, calendarMode]);

  const calendarRange = useMemo(() => {
    const from = calendarDays[0] || startOfManilaDay(new Date());
    const to = calendarDays[calendarDays.length - 1] || from;
    return { from, to };
  }, [calendarDays]);

  const scheduleByDay = useMemo(() => {
    const map = new Map<string, CalendarScheduleEntry[]>();
    const calendarRows = calendarSchedulesQuery.data || [];
    for (const schedule of calendarRows) {
      const entries = expandScheduleForCalendar(schedule, calendarRange.from, calendarRange.to);
      for (const entry of entries) {
        const key = manilaDateKey(entry.startTime);
        const list = map.get(key) || [];
        list.push(entry);
        map.set(key, list);
      }
    }
    return map;
  }, [calendarRange.from, calendarRange.to, calendarSchedulesQuery.data]);

  const scheduleComputedDuration = useMemo(
    () => computeDurationHours(scheduleForm.startClock, scheduleForm.endClock),
    [scheduleForm.startClock, scheduleForm.endClock]
  );
  const scheduleComputedBreakDuration = useMemo(
    () => computeDurationHours(scheduleForm.breakStartClock, scheduleForm.breakEndClock),
    [scheduleForm.breakStartClock, scheduleForm.breakEndClock]
  );
  const bulkComputedDuration = useMemo(
    () => computeDurationHours(bulkForm.startClock, bulkForm.endClock),
    [bulkForm.startClock, bulkForm.endClock]
  );
  const bulkComputedBreakDuration = useMemo(
    () => computeDurationHours(bulkForm.breakStartClock, bulkForm.breakEndClock),
    [bulkForm.breakStartClock, bulkForm.breakEndClock]
  );

  useEffect(() => {
    return () => {
      if (calendarTransitionTimerRef.current) {
        clearTimeout(calendarTransitionTimerRef.current);
      }
    };
  }, []);

  function startCalendarTransition(action: () => void) {
    if (calendarTransitionTimerRef.current) {
      clearTimeout(calendarTransitionTimerRef.current);
    }

    setIsCalendarTransitioning(true);
    action();

    calendarTransitionTimerRef.current = setTimeout(() => {
      setIsCalendarTransitioning(false);
      calendarTransitionTimerRef.current = null;
    }, 220);
  }

  function openCreateForm() {
    setEditingSchedule(null);
    setScheduleForm(buildDefaultScheduleForm());
    setSingleEmployeeFinder("");
    setSingleEmployeeGroupFilter("all");
    setSingleWizardMode(false);
    setSingleWizardStep(1);
    setFormOpen(true);
  }

  function openEditForm(schedule: WorkSchedule) {
    setEditingSchedule(schedule);
    setScheduleForm(buildScheduleFormFromRecord(schedule));
    setSingleEmployeeFinder("");
    setSingleEmployeeGroupFilter("all");
    setSingleWizardMode(false);
    setSingleWizardStep(1);
    setFormOpen(true);
  }

  function handleTemplateAutoFill(templateIdValue: string, target: "schedule" | "bulk") {
    const templateId = Number(templateIdValue);
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    const patch = {
      templateId: String(template.id),
      shiftName: template.name || "",
      startClock: toClockValue(template.startTime),
      endClock: toClockValue(template.endTime),
      breakStartClock: toClockValue(template.breakStart),
      breakEndClock: toClockValue(template.breakEnd),
      notes: template.description || ""
    };

    if (target === "schedule") {
      setScheduleForm((previous) => ({
        ...previous,
        ...patch
      }));
      return;
    }

    setBulkForm((previous) => ({
      ...previous,
      ...patch
    }));
  }

  function submitScheduleForm() {
    const payload = buildSchedulePayload(scheduleForm, scheduleComputedDuration, scheduleComputedBreakDuration);
    if (!payload) {
      pushToast(setToasts, "error", "Fill required schedule fields before saving.");
      return;
    }

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, payload });
      return;
    }
    createSchedule.mutate(payload);
  }

  function buildBulkPayload() {
    if (!bulkForm.dateFrom || !bulkForm.dateTo) {
      pushToast(setToasts, "error", "Select date from and date to.");
      return null;
    }
    if (!bulkForm.employeeIds.length) {
      pushToast(setToasts, "error", "Select at least one employee.");
      return null;
    }
    if (!bulkForm.startClock || !bulkForm.endClock) {
      pushToast(setToasts, "error", "Start and end time are required.");
      return null;
    }

    const payload: Record<string, unknown> = {
      templateId: bulkForm.templateId ? Number(bulkForm.templateId) : undefined,
      shiftName: bulkForm.shiftName || undefined,
      dateFrom: bulkForm.dateFrom,
      dateTo: bulkForm.dateTo,
      recurrenceType: bulkForm.recurrenceType,
      recurrenceDays: bulkForm.recurrenceDays.length ? bulkForm.recurrenceDays : undefined,
      startClock: bulkForm.startClock,
      endClock: bulkForm.endClock,
      breakStartClock: bulkForm.breakStartClock || undefined,
      breakEndClock: bulkForm.breakEndClock || undefined,
      duration: bulkComputedDuration,
      breakDuration: bulkComputedBreakDuration,
      status: bulkForm.status || "ACTIVE",
      notes: bulkForm.notes || undefined,
      employeeIds: bulkForm.employeeIds
    };
    return payload;
  }

  function runBulkPreview() {
    const payload = buildBulkPayload();
    if (!payload) return;
    previewBulkMutation.mutate(payload);
  }

  function runBulkApply() {
    const payload = buildBulkPayload();
    if (!payload) return;
    applyBulkMutation.mutate(payload);
  }

  function startSingleGuidedFlow() {
    setGuideOpen(false);
    setGuideTrack("single");
    setEditingSchedule(null);
    setScheduleForm(buildDefaultScheduleForm());
    setSingleEmployeeFinder("");
    setSingleEmployeeGroupFilter("all");
    setSingleWizardMode(true);
    setSingleWizardStep(1);
    setFormOpen(true);
  }

  function startBulkGuidedFlow() {
    setGuideOpen(false);
    setGuideTrack("bulk");
    setActiveTab("bulk");
    setBulkWizardMode(true);
    setBulkWizardStep(1);
  }

  const singleWizardSteps = [
    "Pick a template or create a shift name",
    "Set date and working hours",
    "Choose repeat settings",
    "Assign employees and save"
  ];

  const bulkWizardSteps = [
    "Choose template and basic details",
    "Set date range and repeat days",
    "Set shift times and break",
    "Select employees, preview, then apply"
  ];

  return (
    <section className="w-full space-y-4">
      <div className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Attendance</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[32px] sm:leading-10">Schedules</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Manage shift templates, assign schedules in bulk, review calendar coverage, and resolve overlap conflicts before
          publishing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={activeTab === "list"} onClick={() => setActiveTab("list")} icon={<CalendarRange className="h-4 w-4" />}>
          Schedule List
        </TabButton>
        <TabButton active={activeTab === "bulk"} onClick={() => setActiveTab("bulk")} icon={<Users2 className="h-4 w-4" />}>
          Bulk Assign
        </TabButton>
        <TabButton active={activeTab === "calendar"} onClick={() => setActiveTab("calendar")} icon={<CalendarDays className="h-4 w-4" />}>
          Calendar View
        </TabButton>
      </div>

      {activeTab === "list" ? (
        <div className="overflow-hidden border-[1.5px] border-line bg-field">
          <div className="flex flex-col gap-3 border-b-[1.5px] border-line/80 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-3">
            <label className="relative min-w-0 w-full sm:max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-md border-line bg-white pl-9 text-[15px]"
                placeholder="Search shift, day, employee, status"
              />
            </label>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="inline-flex h-10 items-center rounded-md border border-line bg-white p-1">
                <button
                  type="button"
                  onClick={() => setListMode("compact")}
                  className={clsx(
                    "inline-flex h-8 items-center rounded px-3 text-xs font-semibold",
                    listMode === "compact" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Compact
                </button>
                <button
                  type="button"
                  onClick={() => setListMode("flat")}
                  className={clsx(
                    "inline-flex h-8 items-center rounded px-3 text-xs font-semibold",
                    listMode === "flat" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Per Day
                </button>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto"
                  onClick={() => setColumnMenuOpen((open) => !open)}
                >
                  <Columns3 className="h-4 w-4" />
                  Columns
                </button>
                {columnMenuOpen ? (
                  <div className="absolute right-0 top-11 z-30 w-60 rounded-md border border-line bg-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Visible columns</p>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-600 hover:underline"
                        onClick={() => setColumnVisibility(defaultTableVisibility)}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="space-y-2">
                      {tableColumns.map((column) => (
                        <label key={column.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line accent-[#0051d5]"
                            checked={columnVisibility[column.id]}
                            onChange={(event) =>
                              setColumnVisibility((previous) => ({
                                ...previous,
                                [column.id]: event.target.checked
                              }))
                            }
                          />
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <Button
                className="h-10 w-full rounded-md px-4 sm:w-auto"
                variant="secondary"
                icon={<BookOpenCheck className="h-4 w-4" />}
                onClick={() => {
                  setGuideTrack("single");
                  setGuideOpen(true);
                }}
              >
                Step-by-step guide
              </Button>
              <Button className="h-10 w-full rounded-md px-4 sm:w-auto" icon={<Plus className="h-4 w-4" />} onClick={openCreateForm}>
                New schedule
              </Button>
            </div>
          </div>

          {schedulesQuery.isLoading ? (
            <ScheduleListSkeleton visibleColumns={visibleColumns} />
          ) : schedulesQuery.isError ? (
            <div className="border-l-[4px] border-signal-red bg-red-50 p-6 text-sm font-medium text-signal-red">
              {toMessage(schedulesQuery.error, "Unable to load schedules.")}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No schedules found.</div>
          ) : (
            <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    {visibleColumns.map((column, index) => (
                      <th
                        key={column.id}
                        className={clsx(
                          "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
                          column.hideOnMobile ? "hidden lg:table-cell" : "",
                          index === 0 ? "rounded-l-md border-l" : "",
                          index === visibleColumns.length - 1 ? "rounded-r-md border-r" : ""
                        )}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedSchedules.map((row) => (
                    <tr key={String(row.id)} className="transition hover:bg-slate-50/70">
                      {columnVisibility.shift ? (
                        <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                          <div className="font-semibold text-ink">{row.shiftName}</div>
                          {isCompactScheduleRow(row) ? (
                            <div className="text-xs text-slate-500">{row.occurrences} occurrence(s)</div>
                          ) : (
                            <div className="text-xs text-slate-500">#{row.id}</div>
                          )}
                        </td>
                      ) : null}
                      {columnVisibility.day ? (
                        <td className="hidden border-b border-line/80 px-4 py-3 align-middle text-slate-700 lg:table-cell">
                          {formatWorkDayLabel(row)}
                        </td>
                      ) : null}
                      {columnVisibility.start ? (
                        <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                          {isCompactScheduleRow(row) ? (
                            <>
                              <div>{formatManilaDate(row.rangeStart)}</div>
                              <div className="text-xs text-slate-500">{toDisplayClock(row.startClock)}</div>
                            </>
                          ) : (
                            <>
                              <div>{formatManilaDate(row.startTime)}</div>
                              <div className="text-xs text-slate-500">{formatManilaClock(row.startTime)}</div>
                            </>
                          )}
                        </td>
                      ) : null}
                      {columnVisibility.end ? (
                        <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                          {isCompactScheduleRow(row) ? (
                            <>
                              <div>{formatManilaDate(row.rangeEnd)}</div>
                              <div className="text-xs text-slate-500">{toDisplayClock(row.endClock)}</div>
                            </>
                          ) : (
                            <>
                              <div>{formatManilaDate(row.endTime)}</div>
                              <div className="text-xs text-slate-500">{formatManilaClock(row.endTime)}</div>
                            </>
                          )}
                        </td>
                      ) : null}
                      {columnVisibility.employees ? (
                        <td className="hidden border-b border-line/80 px-4 py-3 align-middle text-slate-700 lg:table-cell">
                          {(() => {
                            const assignedCount = isCompactScheduleRow(row)
                              ? row.employeeAssignments
                              : (row.employees || []).length;
                            return (
                              <>
                                <div className="font-semibold text-ink">{assignedCount}</div>
                                <div className="text-xs text-slate-500">
                                  {assignedCount === 1 ? "employee assigned" : "employees assigned"}
                                </div>
                              </>
                            );
                          })()}
                        </td>
                      ) : null}
                      {columnVisibility.recurrence ? (
                        <td className="hidden border-b border-line/80 px-4 py-3 align-middle text-slate-700 lg:table-cell">
                          <div className="inline-flex items-center gap-2">
                            <StatusBadge value={row.recurrenceType || "NONE"} />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {isCompactScheduleRow(row)
                              ? row.recurrenceDays || "-"
                              : row.recurrenceDays
                                ? row.recurrenceDays
                                : row.recurrenceEnd
                                  ? `Until ${formatManilaDate(row.recurrenceEnd)}`
                                  : "-"}
                          </div>
                        </td>
                      ) : null}
                      {columnVisibility.status ? (
                        <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                          <StatusBadge value={row.status} />
                        </td>
                      ) : null}
                      {columnVisibility.actions ? (
                        <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                          <div className="flex items-center gap-1">
                            {isCompactScheduleRow(row) ? (
                              <button
                                type="button"
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => {
                                  setListMode("flat");
                                  setSearch(row.shiftName);
                                  setPageIndex(0);
                                }}
                                aria-label="View per-day rows"
                                title="View per-day rows"
                              >
                                <span>Rows</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
                                  onClick={() => openEditForm(row)}
                                  aria-label="Edit schedule"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-signal-red"
                                  onClick={() => setConfirmDeleteId(row.id)}
                                  aria-label="Delete schedule"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredSchedules.length > 0 ? (
            <div className="flex flex-col gap-3 border-t-[1.5px] border-line/80 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs">
                  {filteredSchedules.length} {filteredSchedules.length === 1 ? "record" : "records"}
                </span>
                <select
                  className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} rows
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                  disabled={pageIndex <= 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  Page {pageIndex + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
                  disabled={pageIndex >= pageCount - 1}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "bulk" ? (
        <div className="border-[1.5px] border-line bg-field">
          {isBulkDependenciesLoading ? (
            <BulkAssignSkeleton />
          ) : isBulkDependenciesError ? (
            <div className="border-l-[4px] border-signal-red bg-red-50 p-6 text-sm font-medium text-signal-red">
              {bulkDependenciesErrorMessage}
            </div>
          ) : (
            <>
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-slab text-2xl font-bold text-ink">Bulk Assign Wizard</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Select a template, pick employees, choose a date range, then preview conflicts before applying.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-9 rounded-md px-3 text-xs"
                  icon={<BookOpenCheck className="h-4 w-4" />}
                  onClick={() => {
                    setGuideTrack("bulk");
                    setGuideOpen(true);
                  }}
                >
                  Step-by-step guide
                </Button>
                <Button
                  variant={bulkWizardMode ? "ghost" : "secondary"}
                  className="h-9 rounded-md px-3 text-xs"
                  onClick={() => {
                    setBulkWizardMode((value) => !value);
                    setBulkWizardStep(1);
                  }}
                >
                  {bulkWizardMode ? "Exit guided mode" : "Start guided mode"}
                </Button>
              </div>
            </div>
            {bulkWizardMode ? (
              <div className="mt-3 border border-brand-100 bg-brand-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Guided Step {bulkWizardStep} of 4</p>
                <p className="mt-1 text-sm font-semibold text-brand-700">{bulkWizardSteps[bulkWizardStep - 1]}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 disabled:opacity-40"
                    disabled={bulkWizardStep <= 1}
                    onClick={() => setBulkWizardStep((step) => Math.max(1, step - 1))}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 disabled:opacity-40"
                    disabled={bulkWizardStep >= 4}
                    onClick={() => setBulkWizardStep((step) => Math.min(4, step + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-center gap-2 border-b border-line pb-2">
                  <Filter className="h-4 w-4 text-brand-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Schedule Setup</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 1 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Template</span>
                    <select
                      value={bulkForm.templateId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBulkForm((previous) => ({ ...previous, templateId: value }));
                        if (value) {
                          handleTemplateAutoFill(value, "bulk");
                        }
                      }}
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                    >
                      <option value="">Custom</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 1 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Shift Name</span>
                    <Input
                      value={bulkForm.shiftName}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, shiftName: event.target.value }))}
                      placeholder="Morning Shift"
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 2 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Date From</span>
                    <Input
                      type="date"
                      value={bulkForm.dateFrom}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, dateFrom: event.target.value }))}
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 2 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Date To</span>
                    <Input
                      type="date"
                      value={bulkForm.dateTo}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, dateTo: event.target.value }))}
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 2 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Recurrence</span>
                    <select
                      value={bulkForm.recurrenceType}
                      onChange={(event) =>
                        setBulkForm((previous) => ({
                          ...previous,
                          recurrenceType: event.target.value as RecurrenceType
                        }))
                      }
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                    >
                      {recurrenceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 1 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Status</span>
                    <select
                      value={bulkForm.status}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, status: event.target.value }))}
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Start Time</span>
                    <Input
                      type="time"
                      value={bulkForm.startClock}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, startClock: event.target.value }))}
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">End Time</span>
                    <Input
                      type="time"
                      value={bulkForm.endClock}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, endClock: event.target.value }))}
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break Start</span>
                    <Input
                      type="time"
                      value={bulkForm.breakStartClock}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, breakStartClock: event.target.value }))}
                    />
                  </label>

                  <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break End</span>
                    <Input
                      type="time"
                      value={bulkForm.breakEndClock}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, breakEndClock: event.target.value }))}
                    />
                  </label>

                <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Duration (Hours, Auto)</span>
                  <Input
                    type="text"
                    value={formatDurationValue(bulkComputedDuration)}
                    readOnly
                    disabled
                  />
                </label>

                <label className={clsx("block", bulkWizardMode && bulkWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break Duration (Hours, Auto)</span>
                  <Input
                    type="text"
                    value={formatDurationValue(bulkComputedBreakDuration)}
                    readOnly
                    disabled
                  />
                </label>

                  <label className={clsx("block md:col-span-2", bulkWizardMode && bulkWizardStep !== 2 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Recurrence Days</span>
                    <div className="flex flex-wrap gap-2">
                      {weekdayOptions.map((day) => {
                        const selected = bulkForm.recurrenceDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setBulkForm((previous) => ({
                                ...previous,
                                recurrenceDays: selected
                                  ? previous.recurrenceDays.filter((value) => value !== day)
                                  : [...previous.recurrenceDays, day]
                              }))
                            }
                            className={clsx(
                              "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold",
                              selected
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-line bg-white text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </label>

                  <label className={clsx("block md:col-span-2", bulkWizardMode && bulkWizardStep !== 1 && "hidden")}>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Notes</span>
                    <Textarea
                      value={bulkForm.notes}
                      onChange={(event) => setBulkForm((previous) => ({ ...previous, notes: event.target.value }))}
                      className="min-h-24"
                      placeholder="Optional notes for this assignment batch"
                    />
                  </label>
                </div>
              </section>

              <div className={clsx("flex flex-wrap items-center gap-2 border-t border-line pt-4", bulkWizardMode && bulkWizardStep !== 4 && "hidden")}>
                <Button
                  className="h-10 rounded-md px-4"
                  variant="secondary"
                  onClick={runBulkPreview}
                  disabled={previewBulkMutation.isPending || applyBulkMutation.isPending}
                >
                  {previewBulkMutation.isPending ? "Previewing..." : "Preview Conflicts"}
                </Button>
                <Button
                  className="h-10 rounded-md px-4"
                  onClick={runBulkApply}
                  disabled={previewBulkMutation.isPending || applyBulkMutation.isPending}
                >
                  {applyBulkMutation.isPending ? "Applying..." : "Apply Bulk Assign"}
                </Button>
              </div>
            </div>

            <aside className={clsx("space-y-3 border border-line bg-white p-3", bulkWizardMode && bulkWizardStep !== 4 && "hidden")}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Employees</p>
                <span className="text-xs text-slate-500">{bulkForm.employeeIds.length} selected</span>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Group</span>
                <select
                  value={bulkEmployeeGroupFilter}
                  onChange={(event) => setBulkEmployeeGroupFilter(event.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                >
                  <option value="all">All employees</option>
                  {employeeGroups.map((group) => {
                    const memberCount = groupMemberIdsByGroupId.get(String(group.id))?.size ?? group.memberCount ?? 0;
                    return (
                      <option key={group.id} value={String(group.id)}>
                        {group.name} ({memberCount})
                      </option>
                    );
                  })}
                </select>
              </label>
              <Input
                value={bulkEmployeeFinder}
                onChange={(event) => setBulkEmployeeFinder(event.target.value)}
                placeholder="Search employee"
                className="h-9"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() =>
                    setBulkForm((previous) => ({
                      ...previous,
                      employeeIds: mergeEmployeeIds(previous.employeeIds, filteredBulkEmployeeOptions.map((employee) => employee.id))
                    }))
                  }
                  disabled={!filteredBulkEmployeeOptions.length}
                >
                  Select Visible
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() =>
                    setBulkForm((previous) => ({
                      ...previous,
                      employeeIds: removeEmployeeIds(previous.employeeIds, filteredBulkEmployeeOptions.map((employee) => employee.id))
                    }))
                  }
                  disabled={!bulkForm.employeeIds.length || !filteredBulkEmployeeOptions.length}
                >
                  Clear Visible
                </button>
              </div>
              <div className="max-h-[320px] space-y-1 overflow-y-auto border border-line p-2">
                {filteredBulkEmployeeOptions.map((employee) => {
                  const selected = bulkForm.employeeIds.includes(employee.id);
                  return (
                    <label key={employee.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-line accent-[#0051d5]"
                        checked={selected}
                        onChange={(event) =>
                          setBulkForm((previous) => ({
                            ...previous,
                            employeeIds: event.target.checked
                              ? mergeEmployeeIds(previous.employeeIds, [employee.id])
                              : removeEmployeeIds(previous.employeeIds, [employee.id])
                          }))
                        }
                      />
                      <span className="min-w-0 text-sm text-slate-700">{employeeLabel(employee)}</span>
                    </label>
                  );
                })}
                {!filteredBulkEmployeeOptions.length ? <p className="px-2 py-2 text-sm text-slate-500">No employees found.</p> : null}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{filteredBulkEmployeeOptions.length} visible</span>
                <button
                  type="button"
                  className="font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setBulkForm((previous) => ({ ...previous, employeeIds: [] }))}
                  disabled={!bulkForm.employeeIds.length}
                >
                  Clear All
                </button>
              </div>
            </aside>
          </div>

          {bulkPreview ? (
            <div className="border-t border-line bg-muted px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatPill label="Preview entries" value={bulkPreview.previewCount} />
                <StatPill label="Created" value={bulkPreview.created} />
                <StatPill label="Skipped" value={bulkPreview.skipped} />
                <StatPill label="Warnings" value={bulkPreview.warnings.length} warning={bulkPreview.warnings.length > 0} />
              </div>

              <div className="mt-3 overflow-hidden border border-line bg-white">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Conflict Warnings</p>
                </div>
                {bulkPreview.warnings.length ? (
                  <div className="max-h-64 overflow-y-auto">
                    {bulkPreview.warnings.map((warning, index) => (
                      <div key={`${warning.employeeId}-${warning.date}-${warning.type}-${index}`} className="border-b border-line px-3 py-2 last:border-b-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <WarningBadge type={warning.type} />
                          <span className="text-xs text-slate-500">Employee #{warning.employeeId}</span>
                          <span className="text-xs text-slate-500">{warning.date}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-slate-600">No conflicts found in preview.</div>
                )}
              </div>
            </div>
          ) : null}
            </>
          )}
        </div>
      ) : null}

      {activeTab === "calendar" ? (
        <div className="border-[1.5px] border-line bg-field">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50"
                onClick={() =>
                  startCalendarTransition(() =>
                    setCalendarCursor((current) => (calendarMode === "week" ? addDays(current, -7) : addMonthsManila(current, -1)))
                  )
                }
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => startCalendarTransition(() => setCalendarCursor(startOfManilaDay(new Date())))}
              >
                Today
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50"
                onClick={() =>
                  startCalendarTransition(() =>
                    setCalendarCursor((current) => (calendarMode === "week" ? addDays(current, 7) : addMonthsManila(current, 1)))
                  )
                }
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="ml-1 text-sm font-semibold text-slate-700">{calendarHeadline(calendarCursor, calendarMode)}</div>
            </div>
            <div className="flex items-center gap-2">
              <TabButton
                active={calendarMode === "week"}
                onClick={() => {
                  if (calendarMode === "week") return;
                  startCalendarTransition(() => setCalendarMode("week"));
                }}
                icon={<Clock3 className="h-4 w-4" />}
              >
                Week
              </TabButton>
              <TabButton
                active={calendarMode === "month"}
                onClick={() => {
                  if (calendarMode === "month") return;
                  startCalendarTransition(() => setCalendarMode("month"));
                }}
                icon={<CalendarDays className="h-4 w-4" />}
              >
                Month
              </TabButton>
            </div>
          </div>

          <div className="overflow-x-auto p-3 sm:p-4">
            {isCalendarTransitioning || calendarSchedulesQuery.isLoading || calendarSchedulesQuery.isFetching ? (
              <CalendarGridSkeleton mode={calendarMode} />
            ) : calendarSchedulesQuery.isError ? (
              <div className="border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                {toMessage(calendarSchedulesQuery.error, "Unable to load calendar schedules.")}
              </div>
            ) : (
            <div className={clsx("grid gap-2", calendarMode === "week" ? "grid-cols-7 min-w-[940px]" : "grid-cols-7 min-w-[1040px]")}>
              {weekdayOptions.map((day) => (
                <div
                  key={day}
                  className="border border-line bg-muted px-2 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                >
                  {day.slice(0, 3)}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = manilaDateKey(day);
                const records = (scheduleByDay.get(key) || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isCurrentMonth = calendarMode === "week" ? true : day.getMonth() === calendarCursor.getMonth();
                const isToday = key === manilaDateKey(new Date());

                return (
                  <div
                    key={key}
                    className={clsx(
                      "min-h-[160px] border border-line bg-white p-2",
                      !isCurrentMonth && "bg-slate-50/70",
                      isToday && "border-brand-600 ring-1 ring-brand-600/30"
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={clsx("text-xs font-semibold", isToday ? "text-brand-700" : "text-slate-600")}>{formatDayNumber(day)}</span>
                      <span className="text-[11px] text-slate-500">{records.length} item(s)</span>
                    </div>
                    <div className="space-y-1.5">
                      {records.slice(0, 4).map((record) => (
                        <div
                          key={record.id}
                          className={clsx(
                            "rounded-sm border px-2 py-1 text-xs leading-4",
                            String(record.status).toUpperCase() === "ACTIVE"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-300 bg-slate-100 text-slate-600"
                          )}
                          title={`${record.shiftName} • ${formatManilaClock(record.startTime)} - ${formatManilaClock(record.endTime)}`}
                        >
                          <div className="font-semibold">{record.shiftName}</div>
                          <div>
                            {formatManilaClock(record.startTime)} - {formatManilaClock(record.endTime)}
                          </div>
                        </div>
                      ))}
                      {records.length > 4 ? (
                        <div className="text-xs font-medium text-slate-500">+{records.length - 4} more</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
      ) : null}

      {formOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30">
          <div className="ml-auto flex h-full w-full max-w-[840px] flex-col border-l-[1.5px] border-line bg-field shadow-overlay">
            <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-2.5">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
                onClick={() => {
                  setFormOpen(false);
                  setEditingSchedule(null);
                  setScheduleForm(buildDefaultScheduleForm());
                }}
                aria-label="Close form"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Button
                className="h-8 rounded-md px-3 text-xs"
                onClick={submitScheduleForm}
                disabled={createSchedule.isPending || updateScheduleMutation.isPending || (singleWizardMode && singleWizardStep < 4)}
              >
                {createSchedule.isPending || updateScheduleMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
            <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-3 sm:px-5">
              <h3 className="text-[24px] font-bold leading-7 text-ink sm:text-[28px] sm:leading-8">
                {editingSchedule ? "Edit Schedule" : "New Schedule"}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant={singleWizardMode ? "ghost" : "secondary"}
                  className="h-8 rounded-md px-3 text-xs"
                  onClick={() => {
                    setSingleWizardMode((value) => !value);
                    setSingleWizardStep(1);
                  }}
                >
                  {singleWizardMode ? "Exit guided mode" : "Start guided mode"}
                </Button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingSchedule(null);
                    setScheduleForm(buildDefaultScheduleForm());
                  }}
                  aria-label="Dismiss form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {singleWizardMode ? (
                <div className="mb-4 border border-brand-100 bg-brand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-700">Guided Step {singleWizardStep} of 4</p>
                  <p className="mt-1 text-sm font-semibold text-brand-700">{singleWizardSteps[singleWizardStep - 1]}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-md border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 disabled:opacity-40"
                      disabled={singleWizardStep <= 1}
                      onClick={() => setSingleWizardStep((step) => Math.max(1, step - 1))}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center rounded-md border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-700 disabled:opacity-40"
                      disabled={singleWizardStep >= 4}
                      onClick={() => setSingleWizardStep((step) => Math.min(4, step + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className={clsx("md:col-span-2", singleWizardMode && singleWizardStep !== 1 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Template</span>
                  <select
                    value={scheduleForm.templateId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setScheduleForm((previous) => ({ ...previous, templateId: value }));
                      if (value) {
                        handleTemplateAutoFill(value, "schedule");
                      }
                    }}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    <option value="">Custom schedule</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={clsx("md:col-span-2", singleWizardMode && singleWizardStep !== 1 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Shift Name *</span>
                  <Input
                    value={scheduleForm.shiftName}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, shiftName: event.target.value }))}
                    placeholder="Opening Shift"
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Schedule Date *</span>
                  <Input
                    type="date"
                    value={scheduleForm.scheduleDate}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, scheduleDate: event.target.value }))}
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 1 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Status</span>
                  <select
                    value={scheduleForm.status}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, status: event.target.value }))}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Start Time *</span>
                  <Input
                    type="time"
                    value={scheduleForm.startClock}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, startClock: event.target.value }))}
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">End Time *</span>
                  <Input
                    type="time"
                    value={scheduleForm.endClock}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, endClock: event.target.value }))}
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break Start</span>
                  <Input
                    type="time"
                    value={scheduleForm.breakStartClock}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, breakStartClock: event.target.value }))}
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break End</span>
                  <Input
                    type="time"
                    value={scheduleForm.breakEndClock}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, breakEndClock: event.target.value }))}
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Duration (Hours, Auto)</span>
                  <Input
                    type="text"
                    value={formatDurationValue(scheduleComputedDuration)}
                    readOnly
                    disabled
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 2 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Break Duration (Hours, Auto)</span>
                  <Input
                    type="text"
                    value={formatDurationValue(scheduleComputedBreakDuration)}
                    readOnly
                    disabled
                  />
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Recurrence</span>
                  <select
                    value={scheduleForm.recurrenceType}
                    onChange={(event) =>
                      setScheduleForm((previous) => ({
                        ...previous,
                        recurrenceType: event.target.value as RecurrenceType
                      }))
                    }
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    {recurrenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={clsx(singleWizardMode && singleWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Recurrence End</span>
                  <Input
                    type="date"
                    value={scheduleForm.recurrenceEnd}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, recurrenceEnd: event.target.value }))}
                  />
                </label>

                <label className={clsx("md:col-span-2", singleWizardMode && singleWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Recurrence Days</span>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map((day) => {
                      const selected = scheduleForm.recurrenceDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setScheduleForm((previous) => ({
                              ...previous,
                              recurrenceDays: selected
                                ? previous.recurrenceDays.filter((value) => value !== day)
                                : [...previous.recurrenceDays, day]
                            }))
                          }
                          className={clsx(
                            "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-semibold",
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-line bg-white text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label className={clsx("md:col-span-2", singleWizardMode && singleWizardStep !== 3 && "hidden")}>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Notes</span>
                  <Textarea
                    className="min-h-20"
                    value={scheduleForm.notes}
                    onChange={(event) => setScheduleForm((previous) => ({ ...previous, notes: event.target.value }))}
                  />
                </label>
              </div>

              <div className={clsx("mt-4 border-t border-line pt-4", singleWizardMode && singleWizardStep !== 4 && "hidden")}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Assign Employees</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() =>
                        setScheduleForm((previous) => ({
                          ...previous,
                          employeeIds: mergeEmployeeIds(previous.employeeIds, filteredSingleEmployeeOptions.map((employee) => employee.id))
                        }))
                      }
                      disabled={!filteredSingleEmployeeOptions.length}
                    >
                      Select Visible
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() =>
                        setScheduleForm((previous) => ({
                          ...previous,
                          employeeIds: removeEmployeeIds(previous.employeeIds, filteredSingleEmployeeOptions.map((employee) => employee.id))
                        }))
                      }
                      disabled={!scheduleForm.employeeIds.length || !filteredSingleEmployeeOptions.length}
                    >
                      Clear Visible
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-brand-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setScheduleForm((previous) => ({ ...previous, employeeIds: [] }))}
                      disabled={!scheduleForm.employeeIds.length}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="mb-2 grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Group</span>
                    <select
                      value={singleEmployeeGroupFilter}
                      onChange={(event) => setSingleEmployeeGroupFilter(event.target.value)}
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                    >
                      <option value="all">All employees</option>
                      {employeeGroups.map((group) => {
                        const memberCount = groupMemberIdsByGroupId.get(String(group.id))?.size ?? group.memberCount ?? 0;
                        return (
                          <option key={group.id} value={String(group.id)}>
                            {group.name} ({memberCount})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Search</span>
                    <Input
                      value={singleEmployeeFinder}
                      onChange={(event) => setSingleEmployeeFinder(event.target.value)}
                      placeholder="Search employee"
                      className="h-10"
                    />
                  </label>
                </div>
                <div className="max-h-[260px] space-y-1 overflow-y-auto border border-line bg-white p-2">
                  {filteredSingleEmployeeOptions.map((employee) => {
                    const selected = scheduleForm.employeeIds.includes(employee.id);
                    return (
                      <label key={employee.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-line accent-[#0051d5]"
                        checked={selected}
                        onChange={(event) =>
                          setScheduleForm((previous) => ({
                            ...previous,
                            employeeIds: event.target.checked
                              ? mergeEmployeeIds(previous.employeeIds, [employee.id])
                              : removeEmployeeIds(previous.employeeIds, [employee.id])
                          }))
                        }
                      />
                      <span className="min-w-0 text-sm text-slate-700">{employeeLabel(employee)}</span>
                    </label>
                  );
                })}
                {!filteredSingleEmployeeOptions.length ? <p className="px-2 py-2 text-sm text-slate-500">No employees found.</p> : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {scheduleForm.employeeIds.length} selected / {filteredSingleEmployeeOptions.length} visible
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {guideOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl border border-line bg-white shadow-overlay">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">Beginner Guide</p>
                <h3 className="font-slab text-2xl font-bold text-ink">Schedule Creation Wizard</h3>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
                onClick={() => setGuideOpen(false)}
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-line px-4 py-3 sm:px-5">
              <div className="inline-flex h-10 items-center rounded-md border border-line bg-white p-1">
                <button
                  type="button"
                  onClick={() => setGuideTrack("single")}
                  className={clsx(
                    "inline-flex h-8 items-center rounded px-3 text-xs font-semibold",
                    guideTrack === "single" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Single Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTrack("bulk")}
                  className={clsx(
                    "inline-flex h-8 items-center rounded px-3 text-xs font-semibold",
                    guideTrack === "bulk" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Bulk Schedule
                </button>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
              {guideTrack === "single" ? (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Use this when you need to create one schedule pattern and assign employees carefully step by step.
                  </p>
                  <ol className="space-y-2 text-sm text-slate-700">
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 1:</span> Pick a template (optional), enter shift name, and choose status.
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 2:</span> Set schedule date and working hours (start, end, and break).
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 3:</span> Set repeat behavior (none/daily/weekly/monthly).
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 4:</span> Pick employees to assign, then save.
                    </li>
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="h-9 rounded-md px-3 text-xs" onClick={startSingleGuidedFlow}>
                      Start Single Wizard
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Use this when you need to assign many employees across a date range with repeat rules.
                  </p>
                  <ol className="space-y-2 text-sm text-slate-700">
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 1:</span> Choose a template or enter shift details manually.
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 2:</span> Set date range and select repeat days.
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 3:</span> Set time window and break.
                    </li>
                    <li className="rounded-md border border-line bg-muted px-3 py-2">
                      <span className="font-semibold">Step 4:</span> Select employees, preview conflicts, then apply.
                    </li>
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="h-9 rounded-md px-3 text-xs" onClick={startBulkGuidedFlow}>
                      Start Bulk Wizard
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete schedule?"
        description="This will permanently remove the selected schedule assignment."
        confirmLabel="Delete"
        isConfirming={deleteScheduleMutation.isPending}
        onConfirm={() => {
          if (confirmDeleteId === null) return Promise.resolve();
          return deleteScheduleMutation.mutateAsync(confirmDeleteId).then(() => undefined);
        }}
        onCancel={() => {
          if (deleteScheduleMutation.isPending) return;
          setConfirmDeleteId(null);
        }}
      />

      {toasts.length ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[120] space-y-2">
          {toasts.map((toast) => (
            <div key={toast.id} className={toastClass(toast.type)}>
              {toast.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              <span>{toast.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ScheduleListSkeleton({ visibleColumns }: { visibleColumns: Array<(typeof tableColumns)[number]> }) {
  const rows = 8;
  return (
    <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
      <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {visibleColumns.map((column, index) => (
              <th
                key={`skeleton-head-${column.id}`}
                className={clsx(
                  "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500",
                  column.hideOnMobile ? "hidden lg:table-cell" : "",
                  index === 0 ? "rounded-l-md border-l" : "",
                  index === visibleColumns.length - 1 ? "rounded-r-md border-r" : ""
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`skeleton-row-${rowIndex}`}>
              {visibleColumns.map((column) => (
                <td
                  key={`skeleton-cell-${rowIndex}-${column.id}`}
                  className={clsx(
                    "border-b border-line/80 px-4 py-3 align-middle",
                    column.hideOnMobile ? "hidden lg:table-cell" : ""
                  )}
                >
                  <div className="h-4 animate-pulse rounded bg-slate-200" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkAssignSkeleton() {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="h-7 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-[420px] max-w-full animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={`bulk-form-skeleton-${index}`} className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-10 animate-pulse rounded border border-line bg-white" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 border border-line bg-white p-3">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-9 animate-pulse rounded border border-line bg-slate-100" />
          <div className="h-9 animate-pulse rounded border border-line bg-slate-100" />
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={`bulk-employee-skeleton-${index}`} className="h-8 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarGridSkeleton({ mode }: { mode: "week" | "month" }) {
  const cellCount = mode === "week" ? 7 : 42;
  return (
    <div className={clsx("grid gap-2", mode === "week" ? "grid-cols-7 min-w-[940px]" : "grid-cols-7 min-w-[1040px]")}>
      {weekdayOptions.map((day) => (
        <div
          key={`skeleton-head-${day}`}
          className="border border-line bg-muted px-2 py-2 text-center text-xs font-bold uppercase tracking-[0.08em] text-slate-500"
        >
          {day.slice(0, 3)}
        </div>
      ))}
      {Array.from({ length: cellCount }, (_, index) => (
        <div key={`skeleton-cell-${index}`} className="min-h-[160px] border border-line bg-white p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="h-3 w-5 animate-pulse rounded bg-slate-200" />
            <span className="h-3 w-14 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="space-y-1.5">
            <div className="h-10 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-10 animate-pulse rounded-sm bg-slate-100" />
            <div className="h-4 w-16 animate-pulse rounded-sm bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-semibold",
        warning ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-white text-slate-700"
      )}
    >
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}

function WarningBadge({ type }: { type: ConflictWarning["type"] }) {
  const label = type.replace(/_/g, " ");
  return (
    <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-amber-700">
      {label}
    </span>
  );
}

function buildDefaultScheduleForm(): ScheduleFormState {
  const today = manilaDateInput();
  return {
    templateId: "",
    shiftName: "",
    scheduleDate: today,
    startClock: "08:00",
    endClock: "17:00",
    breakStartClock: "",
    breakEndClock: "",
    duration: "",
    breakDuration: "",
    status: "ACTIVE",
    notes: "",
    recurrenceType: "NONE",
    recurrenceEnd: "",
    recurrenceDays: [],
    employeeIds: []
  };
}

function buildDefaultBulkForm(): BulkFormState {
  const today = manilaDateInput();
  return {
    templateId: "",
    shiftName: "",
    dateFrom: today,
    dateTo: today,
    recurrenceType: "WEEKLY",
    recurrenceDays: [],
    startClock: "08:00",
    endClock: "17:00",
    breakStartClock: "",
    breakEndClock: "",
    duration: "",
    breakDuration: "",
    status: "ACTIVE",
    notes: "",
    employeeIds: []
  };
}

function buildScheduleFormFromRecord(record: WorkSchedule): ScheduleFormState {
  return {
    templateId: "",
    shiftName: record.shiftName || "",
    scheduleDate: manilaDateKey(record.startTime),
    startClock: toClockValue(record.startTime),
    endClock: toClockValue(record.endTime),
    breakStartClock: toClockValue(record.breakStart),
    breakEndClock: toClockValue(record.breakEnd),
    duration: normalizeNumberish(record.duration),
    breakDuration: normalizeNumberish(record.breakDuration),
    status: record.status || "ACTIVE",
    notes: record.notes || "",
    recurrenceType: (record.recurrenceType as RecurrenceType) || "NONE",
    recurrenceEnd: record.recurrenceEnd ? manilaDateKey(record.recurrenceEnd) : "",
    recurrenceDays: parseRecurrenceDays(record.recurrenceDays),
    employeeIds: (record.employees || []).map((assignment) => assignment.employeeId)
  };
}

function buildSchedulePayload(
  form: ScheduleFormState,
  computedDuration?: number,
  computedBreakDuration?: number
) {
  if (!form.shiftName.trim()) {
    return null;
  }
  if (!form.scheduleDate || !form.startClock || !form.endClock) {
    return null;
  }

  const startIso = combineDateAndClockIso(form.scheduleDate, form.startClock);
  if (!startIso) return null;
  const endIso = combineDateAndClockIso(form.scheduleDate, form.endClock, true, startIso);
  if (!endIso) return null;

  const startDate = new Date(startIso);
  const payload: Record<string, unknown> = {
    shiftName: form.shiftName.trim(),
    workDay: manilaWeekday(startDate),
    startTime: startIso,
    endTime: endIso,
    status: form.status || "ACTIVE",
    notes: form.notes || undefined,
    recurrenceType: form.recurrenceType,
    recurrenceEnd: form.recurrenceEnd ? combineDateAndClockIso(form.recurrenceEnd, "23:59") : undefined,
    recurrenceDays: form.recurrenceDays.length ? form.recurrenceDays.join(",") : undefined,
    employeeIds: form.employeeIds.length ? form.employeeIds : undefined
  };

  const breakStart = form.breakStartClock ? combineDateAndClockIso(form.scheduleDate, form.breakStartClock) : null;
  const breakEnd = form.breakEndClock ? combineDateAndClockIso(form.scheduleDate, form.breakEndClock, true, breakStart || undefined) : null;
  if (breakStart) payload.breakStart = breakStart;
  if (breakEnd) payload.breakEnd = breakEnd;
  if (computedDuration !== undefined) payload.duration = computedDuration;
  if (computedBreakDuration !== undefined) payload.breakDuration = computedBreakDuration;

  return payload;
}

function combineDateAndClockIso(dateInput: string, clock: string, allowOvernight = false, referenceIso?: string) {
  if (!dateInput || !clock) return null;
  if (!/^\d{2}:\d{2}$/.test(clock)) return null;

  const value = new Date(`${dateInput}T${clock}:00+08:00`);
  if (Number.isNaN(value.getTime())) return null;

  if (allowOvernight && referenceIso) {
    const reference = new Date(referenceIso);
    if (!Number.isNaN(reference.getTime()) && value <= reference) {
      value.setUTCDate(value.getUTCDate() + 1);
    }
  }

  return value.toISOString();
}

function computeDurationHours(startClock?: string, endClock?: string) {
  if (!startClock || !endClock) return undefined;
  const startMinutes = parseClockMinutes(startClock);
  const endMinutes = parseClockMinutes(endClock);
  if (startMinutes === null || endMinutes === null) return undefined;

  let diff = endMinutes - startMinutes;
  if (diff <= 0) {
    diff += 24 * 60;
  }
  return Number((diff / 60).toFixed(2));
}

function parseClockMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatDurationValue(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

function parseRecurrenceDays(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function employeeLabel(employee: EmployeeRow) {
  const code = employee.employeeCode ? String(employee.employeeCode).trim() : "";
  const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
  const area = employee.store?.area ? String(employee.store.area).trim() : "";
  if (code && name && area) return `${code} - ${name} (${area})`;
  if (code && name) return `${code} - ${name}`;
  return code || name || `Employee #${employee.id}`;
}

function formatWorkDayLabel(row: ScheduleListRow) {
  if (isCompactScheduleRow(row)) {
    return summarizeWorkDays(row.workDays);
  }
  if (!row.workDay) return "-";

  const weekday = weekdayLabelFromToken(row.workDay);
  if (weekday) {
    const short = weekdayShort(weekday);
    if (looksLikeIsoDate(row.workDay)) {
      const readableDate = formatIsoDateLabel(row.workDay);
      return short ? `${readableDate} (${short})` : readableDate;
    }
    return short ? `${weekday} (${short})` : weekday;
  }

  if (looksLikeIsoDate(row.workDay)) {
    return formatIsoDateLabel(row.workDay);
  }

  return row.workDay;
}

function summarizeWorkDays(days: string[]) {
  if (!days.length) return "-";
  const normalized = Array.from(new Set(days.map((day) => day.trim()).filter(Boolean)));
  const weekdayLabels = normalized
    .map((token) => weekdayLabelFromToken(token))
    .filter((value): value is string => Boolean(value));

  if (weekdayLabels.length === normalized.length) {
    return summarizeWeekdayLabels(Array.from(new Set(weekdayLabels)));
  }

  const isoTokens = normalized.filter((token) => looksLikeIsoDate(token)).sort();
  if (isoTokens.length === normalized.length) {
    if (isoTokens.length === 1) {
      return formatIsoDateLabel(isoTokens[0]);
    }
    if (isoTokens.length <= 5) {
      return isoTokens.map((token) => formatIsoDateLabel(token)).join(", ");
    }
    return `Specific dates (${isoTokens.length})`;
  }

  if (normalized.length > 10) {
    return `Multiple values (${normalized.length})`;
  }

  return normalized
    .map((token) => {
      const weekday = weekdayLabelFromToken(token);
      if (weekday) return weekdayShort(weekday) || weekday;
      if (looksLikeIsoDate(token)) return formatIsoDateLabel(token);
      return token;
    })
    .join(", ");
}

function summarizeWeekdayLabels(labels: string[]) {
  const weekdaySet = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const weekendSet = new Set(["Saturday", "Sunday"]);
  const normalized = Array.from(new Set(labels));

  const hasAllWeekdays = normalized.every((day) => weekdaySet.has(day)) && normalized.length === 5;
  const hasAllWeek = normalized.length === 7;
  const isWeekendOnly = normalized.every((day) => weekendSet.has(day)) && normalized.length === 2;

  if (hasAllWeek) return "Daily (Mon-Sun)";
  if (hasAllWeekdays) return "Weekdays (Mon-Fri)";
  if (isWeekendOnly) return "Weekend (Sat-Sun)";

  return normalized.map((day) => weekdayShort(day) || day).join(", ");
}

function weekdayShort(day: string) {
  const map: Record<string, string> = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun"
  };
  return map[day] || "";
}

function weekdayLabelFromToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (weekdayShort(trimmed)) {
    return trimmed;
  }

  if (looksLikeIsoDate(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00+08:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long" }).format(parsed);
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long" }).format(parsed);
  }

  return null;
}

function looksLikeIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatIsoDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function assignedEmployeesLabel(assignments: ScheduleAssignment[], employeesById?: Map<number, EmployeeRow>) {
  if (!assignments.length) return "-";
  return assignments
    .map((assignment) => {
      const employee = assignment.employee;
      if (!employee) {
        const linked = employeesById?.get(assignment.employeeId);
        return linked ? employeeLabel(linked) : `#${assignment.employeeId}`;
      }
      const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
      return employee.employeeCode ? `${employee.employeeCode}${name ? ` - ${name}` : ""}` : name || `#${assignment.employeeId}`;
    })
    .join(", ");
}

function isCompactScheduleRow(row: ScheduleListRow): row is CompactScheduleListRow {
  return "compact" in row && row.compact === true;
}

function sortEmployeeGroups(a: EmployeeGroupRow, b: EmployeeGroupRow) {
  return a.name.localeCompare(b.name);
}

function sortEmployeeRows(a: EmployeeRow, b: EmployeeRow) {
  const aCode = String(a.employeeCode || "");
  const bCode = String(b.employeeCode || "");
  return aCode.localeCompare(bCode);
}

function extractGroupMemberIds(group: EmployeeGroupRow) {
  const ids = new Set<number>();
  for (const member of group.members || []) {
    if (Number.isInteger(member.employeeId) && member.employeeId > 0) {
      ids.add(member.employeeId);
    }
    const fallbackId = member.employee?.id;
    if (typeof fallbackId === "number" && Number.isInteger(fallbackId) && fallbackId > 0) {
      ids.add(fallbackId);
    }
  }

  if (!ids.size && group.memberIdsCsv) {
    for (const value of group.memberIdsCsv.split(",")) {
      const parsed = Number(value.trim());
      if (Number.isInteger(parsed) && parsed > 0) {
        ids.add(parsed);
      }
    }
  }

  return ids;
}

function filterEmployeesForAssignment(
  employees: EmployeeRow[],
  groupMemberIdsByGroupId: Map<string, Set<number>>,
  groupFilter: string,
  finder: string
) {
  let filtered = employees;
  if (groupFilter !== "all") {
    const allowed = groupMemberIdsByGroupId.get(groupFilter) || new Set<number>();
    filtered = employees.filter((employee) => allowed.has(employee.id));
  }

  const term = finder.trim().toLowerCase();
  if (!term) return filtered;
  return filtered.filter((employee) => employeeLabel(employee).toLowerCase().includes(term));
}

function mergeEmployeeIds(existing: number[], toAdd: number[]) {
  const merged = new Set(existing);
  for (const id of toAdd) merged.add(id);
  return Array.from(merged);
}

function removeEmployeeIds(existing: number[], toRemove: number[]) {
  if (!toRemove.length) return existing;
  const removeSet = new Set(toRemove);
  return existing.filter((id) => !removeSet.has(id));
}

function normalizeNumberish(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "toString" in value) {
    return (value as { toString: () => string }).toString();
  }
  return "";
}

function toClockValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const match = value.match(/(\d{2}:\d{2})/);
    return match?.[1] || "";
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

function manilaDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function manilaDateInput(reference = new Date()) {
  return manilaDateKey(reference);
}

function manilaWeekday(value: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long" }).format(value);
}

function formatManilaDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatManilaClock(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function toDisplayClock(value?: string | null) {
  if (!value) return "-";
  if (/^\d{2}:\d{2}$/.test(value)) {
    const parsed = new Date(`1970-01-01T${value}:00+08:00`);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(parsed);
  }
  return formatManilaClock(value);
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function pushToast(
  setToasts: Dispatch<SetStateAction<ToastMessage[]>>,
  type: ToastMessage["type"],
  text: string
) {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  setToasts((previous) => [...previous, { id, type, text }]);
  setTimeout(() => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, 3200);
}

function toastClass(type: ToastMessage["type"]) {
  if (type === "success") {
    return "pointer-events-auto inline-flex max-w-sm items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 shadow";
  }
  return "pointer-events-auto inline-flex max-w-sm items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow";
}

async function fetchCalendarSchedules() {
  const take = 1000;
  let skip = 0;
  const rows: WorkSchedule[] = [];

  while (true) {
    const chunk = await listResource<WorkSchedule>(`schedules?mode=flat&take=${take}&skip=${skip}`);
    rows.push(...chunk);
    if (chunk.length < take) {
      break;
    }
    skip += take;
    if (skip >= 10000) {
      break;
    }
  }

  return rows;
}

function startOfManilaDay(reference: Date) {
  const key = manilaDateKey(reference);
  return new Date(`${key}T00:00:00+08:00`);
}

function startOfMonthManila(reference: Date) {
  const key = manilaDateKey(reference);
  const [year, month] = key.split("-").map((value) => Number(value));
  return new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+08:00`);
}

function startOfWeekManila(reference: Date) {
  const date = startOfManilaDay(reference);
  const weekday = manilaWeekday(date);
  const offset = Math.max(0, weekdayOptions.indexOf(weekday));
  return addDays(date, -offset);
}

function addDays(date: Date, delta: number) {
  return new Date(date.getTime() + delta * 24 * 60 * 60 * 1000);
}

function addMonthsManila(date: Date, delta: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + delta);
  return next;
}

function expandScheduleForCalendar(schedule: WorkSchedule, rangeStart: Date, rangeEnd: Date): CalendarScheduleEntry[] {
  const scheduleStart = new Date(schedule.startTime);
  const scheduleEnd = new Date(schedule.endTime);
  if (Number.isNaN(scheduleStart.getTime()) || Number.isNaN(scheduleEnd.getTime())) {
    return [];
  }

  const startClock = toClockValue(schedule.startTime);
  const endClock = toClockValue(schedule.endTime);
  if (!startClock || !endClock) {
    return [];
  }

  const recurrenceType = String(schedule.recurrenceType || "NONE").toUpperCase() as RecurrenceType;
  const scheduleStartKey = manilaDateKey(scheduleStart);
  const rangeStartKey = manilaDateKey(rangeStart);
  const rangeEndKey = manilaDateKey(rangeEnd);

  const recurrenceEndDate = schedule.recurrenceEnd ? new Date(schedule.recurrenceEnd) : null;
  const recurrenceEndKey =
    recurrenceEndDate && !Number.isNaN(recurrenceEndDate.getTime()) ? manilaDateKey(recurrenceEndDate) : null;
  const effectiveEndKey = recurrenceEndKey && recurrenceEndKey < rangeEndKey ? recurrenceEndKey : rangeEndKey;
  if (effectiveEndKey < rangeStartKey) {
    return [];
  }

  const entries: CalendarScheduleEntry[] = [];
  const addOccurrence = (dateKey: string) => {
    if (!isDateKeyInRange(dateKey, rangeStartKey, effectiveEndKey)) return;
    const startIso = combineDateAndClockIso(dateKey, startClock);
    if (!startIso) return;
    const endIso = combineDateAndClockIso(dateKey, endClock, true, startIso);
    if (!endIso) return;
    entries.push({
      id: `${schedule.id}:${dateKey}`,
      scheduleId: schedule.id,
      shiftName: schedule.shiftName,
      status: schedule.status,
      startTime: startIso,
      endTime: endIso,
    });
  };

  if (recurrenceType === "NONE") {
    addOccurrence(scheduleStartKey);
    return entries;
  }

  const firstKey = scheduleStartKey > rangeStartKey ? scheduleStartKey : rangeStartKey;
  let cursor = dateFromManilaKey(firstKey);
  const until = dateFromManilaKey(effectiveEndKey);
  const startWeekday = manilaWeekday(scheduleStart);
  const recurrenceDays = parseRecurrenceDays(schedule.recurrenceDays)
    .map((value) => weekdayLabelFromToken(value))
    .filter((value): value is string => Boolean(value));
  const recurrenceDaySet = new Set(recurrenceDays.length ? recurrenceDays : [startWeekday]);
  const startDayNumber = Number(scheduleStartKey.split("-")[2]);

  while (cursor <= until) {
    const dayKey = manilaDateKey(cursor);
    if (dayKey >= scheduleStartKey) {
      if (recurrenceType === "DAILY") {
        addOccurrence(dayKey);
      } else if (recurrenceType === "WEEKLY") {
        if (recurrenceDaySet.has(manilaWeekday(cursor))) {
          addOccurrence(dayKey);
        }
      } else if (recurrenceType === "MONTHLY") {
        const dayNumber = Number(dayKey.split("-")[2]);
        if (dayNumber === startDayNumber) {
          addOccurrence(dayKey);
        }
      }
    }
    cursor = addDays(cursor, 1);
  }

  return entries;
}

function dateFromManilaKey(key: string) {
  return new Date(`${key}T00:00:00+08:00`);
}

function isDateKeyInRange(key: string, start: string, end: string) {
  return key >= start && key <= end;
}

function formatDayNumber(date: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", day: "numeric" }).format(date);
}

function calendarHeadline(date: Date, mode: "week" | "month") {
  if (mode === "month") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  const start = startOfWeekManila(date);
  const end = addDays(start, 6);
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric"
  });
  return `${monthFormatter.format(start)} - ${monthFormatter.format(end)}`;
}
