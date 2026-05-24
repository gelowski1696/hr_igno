"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Cell,
  type Column,
  type ColumnDef,
  type Header,
  type SortingState,
  type VisibilityState
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Columns3, Filter, Images, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { API_BASE_URL, apiFetch, createResource, deleteResource, listResource, updateResource } from "@/lib/api";
import { formatCell, getValueByPath } from "@/lib/formatters";
import { toastError, toastSuccess } from "@/lib/toast";
import type { ApiRecord, ResourceConfig, ResourceField } from "@/lib/types";
import { isDateInManilaDay } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { AmortizationDialog } from "./amortization-dialog";
import { EmployeeMugshotsDialog } from "./employee-mugshots-dialog";
import {
  RecordFormDialog,
  type AssignmentEmployeeGroup,
  type AssignmentEmployeeOption,
  type EmployeeAssignmentConfig,
  type EmployeeSelectGroup,
  type EmployeeStoreLink
} from "./record-form-dialog";

type ResourcePageScope = "today-ph" | "all";
type ConfirmationRequest = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
};

type EmployeeGroupRecord = ApiRecord & {
  id?: number;
  name?: string;
  memberIdsCsv?: string;
  members?: Array<{ employeeId?: number; employee?: { id?: number } | null }> | null;
};

export function ResourcePage({
  config,
  endpointOverride,
  listEndpointOverride,
  scope = "all",
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  enableAmortization = false,
  toolbarActions
}: {
  config: ResourceConfig;
  endpointOverride?: string;
  listEndpointOverride?: string;
  scope?: ResourcePageScope;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  enableAmortization?: boolean;
  toolbarActions?: ReactNode;
}) {
  const { user } = useAuth();
  const endpoint = endpointOverride || config.endpoint;
  const listEndpointBase = listEndpointOverride || endpoint;
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const dateRangeEnabled = Boolean(config.dateRangeFilter?.enabled && listEndpointBase);
  const fromParam = config.dateRangeFilter?.fromParam || "from";
  const toParam = config.dateRangeFilter?.toParam || "to";
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterColumnKey, setFilterColumnKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ApiRecord | null>(null);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [amortizationRecord, setAmortizationRecord] = useState<ApiRecord | null>(null);
  const [mugshotRecord, setMugshotRecord] = useState<ApiRecord | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const queryClient = useQueryClient();
  const columnStorageKey = useMemo(() => `resource-columns:${endpoint || config.title}`, [config.title, endpoint]);
  const filterableColumns = useMemo(
    () => config.columns.filter((column) => column.type !== "image"),
    [config.columns]
  );

  useEffect(() => {
    if (!dateRangeEnabled) return;
    if (!config.dateRangeFilter?.defaultToTodayInManila) return;
    const today = manilaDateInput();
    setFromDate((value) => value || today);
    setToDate((value) => value || today);
  }, [config.dateRangeFilter?.defaultToTodayInManila, dateRangeEnabled]);

  const resolvedListEndpoint = useMemo(() => {
    if (!listEndpointBase) return "";
    if (!dateRangeEnabled) return listEndpointBase;

    const params = new URLSearchParams();
    if (fromDate) {
      params.set(fromParam, fromDate);
    }
    if (toDate) {
      params.set(toParam, toDate);
    }
    const query = params.toString();
    if (!query) return listEndpointBase;
    const delimiter = listEndpointBase.includes("?") ? "&" : "?";
    return `${listEndpointBase}${delimiter}${query}`;
  }, [dateRangeEnabled, fromDate, fromParam, listEndpointBase, toDate, toParam]);

  useEffect(() => {
    if (!filterableColumns.length) {
      setFilterColumnKey("");
      return;
    }

    setFilterColumnKey((current) => {
      if (current && filterableColumns.some((column) => column.key === current)) {
        return current;
      }
      return filterableColumns[0]?.key || "";
    });
  }, [filterableColumns]);

  useEffect(() => {
    setColumnMenuOpen(false);
    setFilterMenuOpen(false);
  }, [columnStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(columnStorageKey);
      if (!raw) {
        setColumnVisibility({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const nextVisibility = Object.entries(parsed).reduce<VisibilityState>((state, [key, value]) => {
        if (typeof value === "boolean") {
          state[key] = value;
        }
        return state;
      }, {});
      setColumnVisibility(nextVisibility);
    } catch {
      setColumnVisibility({});
    }
  }, [columnStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(columnStorageKey, JSON.stringify(columnVisibility));
  }, [columnStorageKey, columnVisibility]);

  const resourceQuery = useQuery({
    queryKey: ["resource", resolvedListEndpoint],
    queryFn: () => listResource(resolvedListEndpoint || ""),
    enabled: Boolean(listEndpointBase)
  });

  const needsStoreOptions = Boolean(
    config.formFields?.some((field) => field.name === "storeId" && field.type === "select")
  );
  const needsEmployeeAssignment = Boolean(
    (endpoint === "schedule-templates" || endpoint === "employee-groups") &&
      config.formFields?.some((field) => field.name === "legacyEmployeeIds" || field.name === "memberIdsCsv")
  );
  const needsEmployeeOptions = Boolean(
    needsEmployeeAssignment ||
      config.formFields?.some((field) => field.name === "employeeId" && field.type === "select")
  );
  const needsEmployeeGroupFilter = Boolean(
    (endpoint === "leaves" ||
      endpoint === "leave-balances" ||
      endpoint === "users" ||
      endpoint === "cash-advances" ||
      endpoint === "payroll") &&
      config.formFields?.some((field) => field.name === "employeeId" && field.type === "select")
  );
  const employeeOptionsEndpoint = endpoint === "leaves" ? "leave-balances/some/employee" : "employees";

  const storesQuery = useQuery({
    queryKey: ["resource", "stores", "options"],
    queryFn: () => listResource("stores"),
    enabled: needsStoreOptions
  });
  const employeesQuery = useQuery({
    queryKey: ["resource", "employees", "options", employeeOptionsEndpoint],
    queryFn: () => listResource(employeeOptionsEndpoint),
    enabled: needsEmployeeOptions
  });
  const employeeGroupsQuery = useQuery({
    queryKey: ["resource", "employee-groups", "options"],
    queryFn: () => listResource<EmployeeGroupRecord>("employee-groups"),
    enabled: needsEmployeeAssignment || needsEmployeeGroupFilter
  });

  const createMutation = useMutation({
    mutationFn: (payload: ApiRecord) => createResource(endpoint || "", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      setFormOpen(false);
      toastSuccess("Record created.");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to create record.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ApiRecord }) => updateResource(endpoint || "", id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      setEditingRecord(null);
      toastSuccess("Record updated.");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to update record.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => deleteResource(endpoint || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      toastSuccess("Record deleted.");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to delete record.");
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: number | string) =>
      apiFetch(`${endpoint}/${id}/approve`, {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource"] });
      toastSuccess("Record approved.");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to approve record.");
    }
  });

  const rows = useMemo(() => {
    const data = resourceQuery.data || [];
    let scoped = scope === "today-ph" ? data.filter((row) => isAttendanceRecordForManilaToday(row)) : data;

    const normalizedFilterValue = filterValue.trim().toLowerCase();
    if (normalizedFilterValue && filterColumnKey) {
      scoped = scoped.filter((row) =>
        String(getValueByPath(row, filterColumnKey) ?? "").toLowerCase().includes(normalizedFilterValue)
      );
    }

    const term = search.trim().toLowerCase();
    if (!term) {
      return scoped;
    }

    return scoped.filter((row) =>
      config.columns.some((column) => String(getValueByPath(row, column.key) ?? "").toLowerCase().includes(term))
    );
  }, [config.columns, filterColumnKey, filterValue, resourceQuery.data, scope, search]);

  const hasCreate = Boolean(allowCreate && endpoint && config.formFields?.length);
  const hasEdit = Boolean(allowEdit && endpoint && config.formFields?.length);
  const hasDelete = Boolean(allowDelete && endpoint);
  const hasActions = hasEdit || hasDelete;
  const isNoTimeOutView = (listEndpointBase || "").startsWith("attendance/no-timeout");
  const isPaymentHistoryView = (listEndpointBase || "").includes("payment-history");
  const hasApproveAction = endpoint === "cash-advances" && !isPaymentHistoryView;
  const hasMugshotAction = endpoint === "employees";

  const resolvedFormFields = useMemo<ResourceField[]>(() => {
    const fields = config.formFields || [];
    if (!fields.length) return [];

    return fields.map((field) => {
      if (field.name !== "storeId" || field.type !== "select") {
        if (field.name !== "employeeId" || field.type !== "select") {
          return field;
        }

        const options = (employeesQuery.data || [])
          .map((row) => {
            const value = row.id ?? row.employeeId;
            if (value === undefined || value === null) return null;

            const employeeCode = String(row.employeeCode ?? row.employee_code ?? "").trim();
            const firstName = String(row.firstName ?? row.first_name ?? "").trim();
            const lastName = String(row.lastName ?? row.last_name ?? "").trim();
            const storeArea = String(
              row.storeArea ??
                row.store_area ??
                (typeof row.store === "object" && row.store ? (row.store as Record<string, unknown>).area ?? "" : "")
            ).trim();
            const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
            const baseLabel = employeeCode && fullName ? `${employeeCode} - ${fullName}` : employeeCode || fullName || `Employee ${value}`;
            const label = storeArea ? `${baseLabel} (${storeArea})` : baseLabel;
            return { label, value: String(value) };
          })
          .filter((option): option is { label: string; value: string } => Boolean(option))
          .sort((a, b) => a.label.localeCompare(b.label));

        const decoratedOptions =
          endpoint === "users"
            ? [{ label: "No employee link", value: "" }, ...options]
            : options;

        return {
          ...field,
          options: decoratedOptions
        };
      }

      const options = (storesQuery.data || [])
        .map((row) => {
          const value = row.id ?? row.storeId;
          if (value === undefined || value === null) return null;
          const code = String(row.code ?? row.storeCode ?? "").trim();
          const name = String(row.name ?? row.storeName ?? "").trim();
          const label = code && name ? `${code} - ${name}` : name || code || `Store ${value}`;
          return { label, value: String(value) };
        })
        .filter((option): option is { label: string; value: string } => Boolean(option))
        .sort((a, b) => a.label.localeCompare(b.label));

      const decoratedOptions =
        endpoint === "users"
          ? [{ label: "No store link", value: "" }, ...options]
          : options;

      return {
        ...field,
        options: decoratedOptions
      };
    });
  }, [config.formFields, employeesQuery.data, storesQuery.data, endpoint]);

  const employeeAssignment = useMemo<EmployeeAssignmentConfig | undefined>(() => {
    if (!needsEmployeeAssignment) return undefined;

    const employees: AssignmentEmployeeOption[] = (employeesQuery.data || [])
      .map((row) => {
        const value = row.id ?? row.employeeId;
        if (value === undefined || value === null) return null;

        const employeeCode = String(row.employeeCode ?? row.employee_code ?? "").trim();
        const firstName = String(row.firstName ?? row.first_name ?? "").trim();
        const lastName = String(row.lastName ?? row.last_name ?? "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const label = employeeCode && fullName ? `${employeeCode} - ${fullName}` : employeeCode || fullName || `Employee ${value}`;
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) return null;
        return { id, label };
      })
      .filter((item): item is AssignmentEmployeeOption => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label));

    const groups: AssignmentEmployeeGroup[] = (employeeGroupsQuery.data || [])
      .map((row) => {
        const rawId = row.id;
        const id = rawId === undefined || rawId === null ? "" : String(rawId);
        const name = String(row.name || "").trim();
        if (!id || !name) return null;
        const memberIds = extractEmployeeGroupMemberIds(row);
        return { id, name, memberIds };
      })
      .filter((group): group is AssignmentEmployeeGroup => Boolean(group))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      enabled: true,
      employees,
      groups
    };
  }, [employeeGroupsQuery.data, employeesQuery.data, needsEmployeeAssignment]);

  const employeeSelectGroups = useMemo<EmployeeSelectGroup[] | undefined>(() => {
    if (!needsEmployeeGroupFilter) return undefined;

    const groups = (employeeGroupsQuery.data || [])
      .map((row) => {
        const rawId = row.id;
        const id = rawId === undefined || rawId === null ? "" : String(rawId);
        const name = String(row.name || "").trim();
        if (!id || !name) return null;
        const memberIds = extractEmployeeGroupMemberIds(row);
        return { id, name, memberIds };
      })
      .filter((group): group is EmployeeSelectGroup => Boolean(group))
      .sort((a, b) => a.name.localeCompare(b.name));

    return groups;
  }, [employeeGroupsQuery.data, needsEmployeeGroupFilter]);

  const employeeStoreLinks = useMemo<EmployeeStoreLink[] | undefined>(() => {
    if (endpoint !== "users") return undefined;

    const links = (employeesQuery.data || [])
      .map((row) => {
        const rawEmployeeId = row.id ?? row.employeeId;
        const employeeId = Number(rawEmployeeId);
        if (!Number.isInteger(employeeId) || employeeId <= 0) return null;

        const rawStoreId =
          row.storeId ??
          (typeof row.store === "object" && row.store
            ? (row.store as Record<string, unknown>).id
            : null);

        const storeIdNumber = rawStoreId === null || rawStoreId === undefined ? null : Number(rawStoreId);
        return {
          employeeId,
          storeId: storeIdNumber !== null && Number.isInteger(storeIdNumber) && storeIdNumber > 0 ? storeIdNumber : null,
        };
      })
      .filter((item): item is EmployeeStoreLink => Boolean(item));

    return links;
  }, [employeesQuery.data, endpoint]);

  const columns = useMemo<ColumnDef<ApiRecord>[]>(() => {
    const baseColumns: ColumnDef<ApiRecord>[] = config.columns.map((column) => ({
      id: column.key,
      accessorFn: (row) => getValueByPath(row, column.key),
      header: column.header,
      enableHiding: true,
      cell: ({ getValue }) => {
        const value = getValue();
        if (column.type === "status") {
          return <StatusBadge value={value} />;
        }
        if (column.type === "image") {
          const imageSrc = resolveImageCellSrc(value);
          if (!imageSrc) {
            return <span className="text-slate-400">-</span>;
          }

          return (
            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-line bg-white hover:border-brand-500"
              onClick={() => setPreviewImageSrc(imageSrc)}
              aria-label="Preview image"
              title="Open image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          );
        }
        return <span className="line-clamp-2">{formatCell(value, column.type)}</span>;
      },
      meta: {
        hideOnMobile: column.hideOnMobile
      }
    }));

    if (hasActions || hasApproveAction || enableAmortization || hasMugshotAction) {
      baseColumns.push({
        id: "__actions",
        header: "Actions",
        cell: ({ row }) => {
          const id = row.original.id;
          const normalizedStatus = String(row.original.status || "").trim().toUpperCase();
          const canApprove = hasApproveAction && normalizedStatus === "PENDING";
          if (id === undefined || id === null) {
            return <span className="text-slate-400">-</span>;
          }

          return (
            <div className="flex items-center gap-1">
              {hasMugshotAction ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMugshotRecord(row.original);
                  }}
                  aria-label="Open mugshots"
                  title="Mugshots"
                >
                  <Images className="h-4 w-4" />
                </button>
              ) : null}
              {enableAmortization ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink disabled:opacity-40"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAmortizationRecord(row.original);
                  }}
                  aria-label="Open amortization"
                  title="Amortization"
                  disabled={!shouldEnableAmortization(row.original)}
                >
                  <CalendarClock className="h-4 w-4" />
                </button>
              ) : null}
              {canApprove ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-signal-green disabled:opacity-40"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmation({
                      title: "Approve record?",
                      description: "This will mark the record as approved and allow payment posting.",
                      confirmLabel: "Approve",
                      onConfirm: () => approveMutation.mutateAsync(id as string | number).then(() => undefined),
                    });
                  }}
                  aria-label="Approve record"
                  title="Approve"
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </button>
              ) : null}
              {hasEdit ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingRecord(isNoTimeOutView ? buildNoTimeOutEditSeed(row.original) : row.original);
                  }}
                  aria-label={isNoTimeOutView ? "Set time out" : "Edit record"}
                  title={isNoTimeOutView ? "Set time out" : "Edit"}
                >
                  {isNoTimeOutView ? <Clock3 className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
              ) : null}
              {hasDelete ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-signal-red"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmation({
                      title: "Delete record?",
                      description: "This action permanently removes the selected record.",
                      confirmLabel: "Delete",
                      onConfirm: () => deleteMutation.mutateAsync(id as string | number).then(() => undefined),
                    });
                  }}
                  aria-label="Delete record"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false
      });
    }

    return baseColumns;
    }, [approveMutation, config.columns, deleteMutation, enableAmortization, hasActions, hasApproveAction, hasDelete, hasEdit, hasMugshotAction, isNoTimeOutView]);

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const pagedRows = table.getRowModel().rows;

  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = Math.max(table.getPageCount(), 1);
  const pageItems = useMemo(() => buildPageItems(pageIndex, pageCount), [pageCount, pageIndex]);
  const toggleableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visibleToggleableColumns = toggleableColumns.filter((column) => column.getIsVisible());
  const canHideMoreColumns = visibleToggleableColumns.length > 1;
  const hasActiveFilter = Boolean(filterValue.trim());

  async function runConfirmation() {
    if (!confirmation) return;

    try {
      setIsConfirmingAction(true);
      await confirmation.onConfirm();
      setConfirmation(null);
    } catch (error) {
      console.error(error);
      toastError(error instanceof Error ? error.message : "Unable to complete the action.");
    } finally {
      setIsConfirmingAction(false);
    }
  }

  return (
    <section className="w-full space-y-4">
      <div className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{config.eyebrow}</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[32px] sm:leading-10">{config.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{config.description}</p>
      </div>

      <div className="overflow-hidden border-[1.5px] border-line bg-field">
        <div className="flex flex-col gap-3 border-b-[1.5px] border-line/80 p-2.5 sm:p-3 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-10 rounded-md border-line bg-white pl-9 text-[15px]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder || "Search records"}
            />
          </label>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {dateRangeEnabled ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Input
                  type="date"
                  className="h-10 w-full rounded-md border-line bg-white px-3 text-sm sm:w-[150px]"
                  value={fromDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    setFromDate(next);
                    if (toDate && next && toDate < next) {
                      setToDate(next);
                    }
                  }}
                  aria-label="From date"
                />
                <Input
                  type="date"
                  className="h-10 w-full rounded-md border-line bg-white px-3 text-sm sm:w-[150px]"
                  value={toDate}
                  onChange={(event) => {
                    const next = event.target.value;
                    setToDate(next);
                    if (fromDate && next && fromDate > next) {
                      setFromDate(next);
                    }
                  }}
                  aria-label="To date"
                />
              </div>
            ) : null}

            <div className="relative">
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto sm:justify-start"
                title="Show or hide columns"
                onClick={() => {
                  setColumnMenuOpen((open) => !open);
                  setFilterMenuOpen(false);
                }}
              >
                <Columns3 className="h-4 w-4" />
                Columns
                <ChevronDown className={`h-4 w-4 transition ${columnMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {columnMenuOpen ? (
                <div className="absolute right-0 top-11 z-20 w-64 rounded-md border border-line bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Visible columns</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-600 hover:underline"
                      onClick={() => table.resetColumnVisibility()}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {toggleableColumns.map((column) => {
                      const checked = column.getIsVisible();
                      const disableToggle = checked && !canHideMoreColumns;
                      return (
                        <label key={column.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line accent-[#0051d5]"
                            checked={checked}
                            disabled={disableToggle}
                            onChange={column.getToggleVisibilityHandler()}
                          />
                          <span className={disableToggle ? "text-slate-400" : ""}>{columnToggleLabel(column)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto sm:justify-start"
                title="Table filters"
                disabled={!filterableColumns.length}
                onClick={() => {
                  if (!filterableColumns.length) return;
                  setFilterMenuOpen((open) => !open);
                  setColumnMenuOpen(false);
                }}
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilter ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-none text-white">
                    1
                  </span>
                ) : null}
              </button>
              {filterMenuOpen ? (
                <div className="absolute right-0 top-11 z-20 w-[280px] rounded-md border border-line bg-white p-3 shadow-lg">
                  <div className="mb-2 border-b border-line pb-2">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Table filters</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Field</span>
                      <select
                        className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm text-ink"
                        value={filterColumnKey}
                        onChange={(event) => setFilterColumnKey(event.target.value)}
                      >
                        {filterableColumns.map((column) => (
                          <option key={column.key} value={column.key}>
                            {column.header}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Contains</span>
                      <Input
                        className="h-9 rounded-md border-line bg-white text-sm"
                        value={filterValue}
                        onChange={(event) => setFilterValue(event.target.value)}
                        placeholder="Type a value"
                      />
                    </label>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        onClick={() => setFilterMenuOpen(false)}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-600 hover:underline"
                        onClick={() => setFilterValue("")}
                      >
                        Clear filter
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            {toolbarActions ? toolbarActions : null}
            {hasCreate ? (
              <Button className="h-10 w-full rounded-md px-4 sm:w-auto" icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                {config.createLabel || "Add manually"}
              </Button>
            ) : null}
          </div>
        </div>

        {resourceQuery.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : resourceQuery.isError ? (
          <div className="border-l-[4px] border-signal-red bg-red-50 p-8 text-sm font-medium text-signal-red">
            {(resourceQuery.error as Error).message || "Unable to load this resource."}
          </div>
        ) : !endpoint ? (
          <div className="p-8 text-sm text-slate-600">{config.emptyLabel || "This workflow is ready for its API module."}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-600">{config.emptyLabel || "No records found."}</div>
        ) : (
          <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
            <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm lg:min-w-[1040px]">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={headerCellClass(header)}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.column.getCanSort() ? (
                          <button type="button" className="inline-flex items-center gap-1">
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                            {sortIcon(header)}
                          </button>
                        ) : (
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/70">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={bodyCellClass(cell)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t-[1.5px] border-line/80 px-2.5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </span>
            <select
              className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:justify-end">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => table.setPageIndex(item)}
                  className={
                    item === pageIndex
                      ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-semibold text-white"
                      : "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  }
                >
                  {item + 1}
                </button>
              )
            )}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {hasCreate ? (
        <RecordFormDialog
          open={formOpen}
          mode="create"
          title={config.createLabel || config.title}
          fields={resolvedFormFields}
          formVariant={config.formVariant}
          panelClassName={config.formPanelClassName}
          employeeAssignment={employeeAssignment}
          employeeSelectGroups={employeeSelectGroups}
          employeeStoreLinks={employeeStoreLinks}
          isSubmitting={createMutation.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={(payload) => createMutation.mutateAsync(payload).then(() => undefined)}
        />
      ) : null}

      {hasEdit && editingRecord ? (
        <RecordFormDialog
          open={Boolean(editingRecord)}
          mode="edit"
          title={`Edit ${config.title}`}
          fields={resolvedFormFields}
          formVariant={config.formVariant}
          panelClassName={config.formPanelClassName}
          employeeAssignment={employeeAssignment}
          employeeSelectGroups={employeeSelectGroups}
          employeeStoreLinks={employeeStoreLinks}
          initialValues={editingRecord}
          isSubmitting={updateMutation.isPending}
          isDeleting={deleteMutation.isPending}
          onClose={() => setEditingRecord(null)}
          onSubmit={(payload) => {
            const id = editingRecord.id;
            if (id === undefined || id === null) {
              return Promise.resolve();
            }
            const nextPayload = isNoTimeOutView
              ? buildNoTimeOutResolvePayload(payload, editingRecord, user?.username)
              : payload;
            return updateMutation.mutateAsync({ id: id as string | number, payload: nextPayload }).then(() => undefined);
          }}
          onDelete={
            hasDelete
              ? () => {
                  const id = editingRecord.id;
                  if (id === undefined || id === null) {
                    return Promise.resolve();
                  }
                  setConfirmation({
                    title: "Delete record?",
                    description: "This action permanently removes this record and cannot be undone.",
                    confirmLabel: "Delete",
                    onConfirm: () =>
                      deleteMutation.mutateAsync(id as string | number).then(() => {
                        setEditingRecord(null);
                      }),
                  });
                  return Promise.resolve();
                }
              : undefined
          }
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || "Confirm action"}
        description={confirmation?.description || ""}
        confirmLabel={confirmation?.confirmLabel}
        isConfirming={isConfirmingAction}
        onConfirm={runConfirmation}
        onCancel={() => {
          if (isConfirmingAction) return;
          setConfirmation(null);
        }}
      />

      {previewImageSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setPreviewImageSrc(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPreviewImageSrc(null)}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImageSrc}
            alt="Attendance capture"
            className="max-h-[90vh] max-w-[96vw] rounded-md border border-white/20 bg-white object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}

      <AmortizationDialog
        open={Boolean(amortizationRecord)}
        record={amortizationRecord}
        endpoint={endpoint || "cash-advances"}
        onClose={() => setAmortizationRecord(null)}
        onPaid={() => {
          queryClient.invalidateQueries({ queryKey: ["resource"] });
        }}
      />

      <EmployeeMugshotsDialog
        open={Boolean(mugshotRecord)}
        employeeId={resolveRecordId(mugshotRecord)}
        employeeLabel={formatEmployeeRowLabel(mugshotRecord)}
        onClose={() => setMugshotRecord(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["resource"] });
        }}
      />
    </section>
  );
}

const absoluteUrlPattern = /^https?:\/\//i;
const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const apiOrigin = resolveApiOrigin(API_BASE_URL);

function resolveApiOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function resolveImageCellSrc(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("data:image/")) {
    return raw;
  }

  if (absoluteUrlPattern.test(raw)) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return apiOrigin ? `${apiOrigin}${raw}` : raw;
  }

  if (raw.startsWith("uploads/")) {
    return apiOrigin ? `${apiOrigin}/${raw}` : `/${raw}`;
  }

  if (looksLikeBase64Image(raw)) {
    const mime = raw.startsWith("iVBORw0KGgo") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${raw}`;
  }

  return raw;
}

function looksLikeBase64Image(value: string) {
  if (value.length < 64) return false;
  if (value.includes("/") || value.includes("\\")) return false;
  return base64Pattern.test(value);
}

function formatEmployeeRowLabel(record: ApiRecord | null) {
  if (!record) return "";
  const code = String(record.employeeCode ?? "").trim();
  const firstName = String(record.firstName ?? "").trim();
  const lastName = String(record.lastName ?? "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (code && fullName) return `${code} - ${fullName}`;
  return code || fullName;
}

function resolveRecordId(record: ApiRecord | null) {
  if (!record) return null;
  const value = Number(record.id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function buildPageItems(pageIndex: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, idx) => idx);
  }

  const items: Array<number | "ellipsis"> = [0];
  const start = Math.max(1, pageIndex - 1);
  const end = Math.min(pageCount - 2, pageIndex + 1);

  if (start > 1) {
    items.push("ellipsis");
  }

  for (let idx = start; idx <= end; idx += 1) {
    items.push(idx);
  }

  if (end < pageCount - 2) {
    items.push("ellipsis");
  }

  items.push(pageCount - 1);
  return items;
}

function sortIcon(header: Header<ApiRecord, unknown>) {
  const sort = header.column.getIsSorted();
  if (sort === "asc") {
    return <ChevronUp className="h-4 w-4 text-slate-500" />;
  }
  if (sort === "desc") {
    return <ChevronDown className="h-4 w-4 text-slate-500" />;
  }
  return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
}

function visibilityClass(meta: unknown) {
  return (meta as { hideOnMobile?: boolean } | undefined)?.hideOnMobile ? "hidden lg:table-cell" : "";
}

function headerCellClass(header: Header<ApiRecord, unknown>) {
  const metaClass = visibilityClass(header.column.columnDef.meta);
  const isFirst = header.index === 0;
  const isLast = header.headerGroup.headers[header.headerGroup.headers.length - 1]?.id === header.id;

  return [
    "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
    metaClass,
    isFirst ? "rounded-l-md border-l" : "",
    isLast ? "rounded-r-md border-r" : "border-r-0"
  ]
    .filter(Boolean)
    .join(" ");
}

function bodyCellClass(cell: Cell<ApiRecord, unknown>) {
  const metaClass = visibilityClass(cell.column.columnDef.meta);

  return [
    "border-b border-line/80 px-4 py-3 align-middle text-slate-700",
    metaClass
  ]
    .filter(Boolean)
    .join(" ");
}

function columnToggleLabel(column: Column<ApiRecord, unknown>) {
  const header = column.columnDef.header;
  if (typeof header === "string") {
    return header;
  }

  const normalizedId = column.id
    .replace(/^_+/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!normalizedId) {
    return "Column";
  }

  return normalizedId
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shouldEnableAmortization(row: ApiRecord) {
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return false;

  const recordType = String(row.type ?? "").trim().toLowerCase();
  const isLoanType =
    recordType === "loan" ||
    recordType === "sss loan" ||
    recordType === "pag-ibig loan" ||
    recordType === "philhealth loan";
  if (!isLoanType) return false;

  const plan = Number(row.installmentPlan ?? row.installment_plan ?? 0);
  const amount = Number(row.totalAmount ?? row.totalamount ?? row.amount ?? 0);
  return Number.isFinite(amount) && amount > 0 && Number.isFinite(plan) && plan >= 1;
}

function isAttendanceRecordForManilaToday(row: ApiRecord) {
  return (
    isDateInManilaDay(row.timeIn) ||
    isDateInManilaDay(row.createdAt)
  );
}

function extractEmployeeGroupMemberIds(group: EmployeeGroupRecord) {
  const ids = new Set<number>();
  const csv = typeof group.memberIdsCsv === "string" ? group.memberIdsCsv : "";
  for (const token of csv.split(",")) {
    const value = Number(token.trim());
    if (Number.isInteger(value) && value > 0) {
      ids.add(value);
    }
  }

  for (const member of group.members || []) {
    const directId = member.employeeId;
    if (typeof directId === "number" && Number.isInteger(directId) && directId > 0) {
      ids.add(directId);
    }
    const nestedId = member.employee?.id;
    if (typeof nestedId === "number" && Number.isInteger(nestedId) && nestedId > 0) {
      ids.add(nestedId);
    }
  }

  return Array.from(ids).sort((a, b) => a - b);
}

function buildNoTimeOutEditSeed(record: ApiRecord) {
  const createdReference = typeof record.createdAt === "string" ? record.createdAt : record.timeIn;
  const seededDate = toManilaDateInput(createdReference);

  const payload: ApiRecord = {
    ...record,
  };

  if (seededDate) {
    payload.createdDate = seededDate;
  }

  if (typeof record.timeOut === "string" && record.timeOut.trim()) {
    const seededClock = toClockInput(record.timeOut);
    if (seededClock) {
      payload.timeOutClock = seededClock;
    }
  }

  return payload;
}

function buildNoTimeOutResolvePayload(payload: ApiRecord, record: ApiRecord, username?: string) {
  const actor = typeof username === "string" && username.trim() ? username.trim() : "System";
  const createdDate =
    typeof payload.createdDate === "string" && payload.createdDate.trim()
      ? payload.createdDate.trim()
      : toManilaDateInput(typeof record.createdAt === "string" ? record.createdAt : record.timeIn);

  const nextPayload: ApiRecord = {
    ...payload,
    createdDate,
    locationOut: `Manual encoded by ${actor}`,
    encoder: actor,
    source: "ADMIN_MANUAL",
  };

  if (!nextPayload.manualReason) {
    nextPayload.manualReason = "Manual time-out resolve";
  }

  return nextPayload;
}

function toClockInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);

  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

function toManilaDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return manilaDateInput(parsed);
}

function manilaDateInput(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(reference);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "";
  }
  return `${year}-${month}-${day}`;
}
