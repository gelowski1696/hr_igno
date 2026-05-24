"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Eye, FilePlus2, Search, Trash2, Upload, X } from "lucide-react";

import { API_BASE_URL, apiFetch } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";

type StoredFileRow = {
  id: number;
  module: string;
  ownerType?: string | null;
  ownerId?: number | null;
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById?: number | null;
  createdAt: string;
};

type FilesListResponse = {
  data: StoredFileRow[];
  total: number;
  take: number;
  skip: number;
};

type UploadFormState = {
  module: string;
  ownerType: string;
  ownerId: string;
};

const moduleOptions = [
  { value: "employee_documents", label: "Employee Documents" },
  { value: "attendance", label: "Attendance" },
  { value: "payroll", label: "Payroll" },
  { value: "leaves", label: "Leaves" },
  { value: "imports", label: "Imports" },
  { value: "general", label: "General" },
];

const ownerTypeOptions = [
  { value: "", label: "No owner link" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "STORE", label: "Store" },
  { value: "PAYROLL", label: "Payroll" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "LEAVE", label: "Leave" },
  { value: "OTHER", label: "Other" },
];

export default function FilesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>({
    module: "employee_documents",
    ownerType: "",
    ownerId: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const [pendingDelete, setPendingDelete] = useState<StoredFileRow | null>(null);

  const skip = pageIndex * pageSize;
  const apiOrigin = useMemo(() => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return "";
    }
  }, []);

  const filesQuery = useQuery({
    queryKey: ["files", search, moduleFilter, ownerTypeFilter, pageSize, skip],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("take", String(pageSize));
      params.set("skip", String(skip));
      if (search.trim()) params.set("q", search.trim());
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (ownerTypeFilter !== "all") params.set("ownerType", ownerTypeFilter);
      return apiFetch<FilesListResponse>(`files?${params.toString()}`);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("module", uploadForm.module);
      if (uploadForm.ownerType) {
        formData.append("ownerType", uploadForm.ownerType);
      }
      const ownerId = Number(uploadForm.ownerId);
      if (Number.isInteger(ownerId) && ownerId > 0) {
        formData.append("ownerId", String(ownerId));
      }
      for (const file of selectedFiles) {
        formData.append("files", file);
      }
      return apiFetch<{ created: StoredFileRow[] }>("files", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      setUploadSuccess(`${result.created.length} file(s) uploaded.`);
      setUploadError("");
      setSelectedFiles([]);
      setUploadOpen(false);
      toastSuccess(`${result.created.length} file(s) uploaded.`, "Upload Complete");
    },
    onError: (error: unknown) => {
      setUploadError(toMessage(error, "Unable to upload files."));
      setUploadSuccess("");
      toastError(toMessage(error, "Unable to upload files."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`files/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      setPendingDelete(null);
      toastSuccess("File deleted.");
    },
    onError: (error: unknown) => {
      toastError(toMessage(error, "Unable to delete file."));
    },
  });

  const rows = filesQuery.data?.data || [];
  const total = filesQuery.data?.total || 0;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  function openUpload() {
    setUploadError("");
    setUploadSuccess("");
    setSelectedFiles([]);
    setUploadForm({
      module: "employee_documents",
      ownerType: "",
      ownerId: "",
    });
    setUploadOpen(true);
  }

  function submitUpload() {
    if (!selectedFiles.length) {
      setUploadError("Select at least one file.");
      setUploadSuccess("");
      toastError("Select at least one file.");
      return;
    }
    uploadMutation.mutate();
  }

  return (
    <section className="w-full space-y-4">
      <div className="border-b-[1.5px] border-line pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">File Workspace</p>
        <h2 className="mt-1 font-slab text-[27px] font-bold leading-8 text-ink sm:text-[32px] sm:leading-10">Files</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Upload and manage employee documents, import sheets, and generated HR files in one searchable workspace.
        </p>
      </div>

      <div className="overflow-hidden border-[1.5px] border-line bg-field">
        <div className="flex flex-col gap-3 border-b-[1.5px] border-line/80 p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-3">
          <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-0 w-full sm:max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPageIndex(0);
                }}
                className="h-10 rounded-md border-line bg-white pl-9 text-[15px]"
                placeholder="Search file name, module, mime type"
              />
            </label>
            <select
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value);
                setPageIndex(0);
              }}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink sm:w-[220px]"
            >
              <option value="all">All modules</option>
              {moduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={ownerTypeFilter}
              onChange={(event) => {
                setOwnerTypeFilter(event.target.value);
                setPageIndex(0);
              }}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink sm:w-[180px]"
            >
              <option value="all">All owners</option>
              {ownerTypeOptions
                .filter((option) => option.value)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>
          <Button className="h-10 w-full rounded-md px-4 sm:w-auto" icon={<FilePlus2 className="h-4 w-4" />} onClick={openUpload}>
            Upload files
          </Button>
        </div>

        {uploadSuccess ? (
          <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{uploadSuccess}</div>
        ) : null}

        {filesQuery.isLoading ? (
          <FilesTableSkeleton />
        ) : filesQuery.isError ? (
          <div className="border-l-[4px] border-signal-red bg-red-50 p-6 text-sm font-medium text-signal-red">
            {toMessage(filesQuery.error, "Unable to load files.")}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-600">No files found for the current filters.</div>
        ) : (
          <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
            <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {["File Name", "Module", "Owner", "Type", "Size", "Uploaded", "Actions"].map((header, index, list) => (
                    <th
                      key={header}
                      className={[
                        "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
                        index === 0 ? "rounded-l-md border-l" : "",
                        index === list.length - 1 ? "rounded-r-md border-r" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const url = resolveFileUrl(apiOrigin, row.relativePath);
                  return (
                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                        <div className="font-semibold text-ink">{row.originalName}</div>
                        <div className="text-xs text-slate-500">{row.storedName}</div>
                      </td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">{humanizeToken(row.module)}</td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                        {row.ownerType ? (
                          <>
                            <div>{humanizeToken(row.ownerType)}</div>
                            <div className="text-xs text-slate-500">{row.ownerId ? `#${row.ownerId}` : "-"}</div>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">{row.mimeType}</td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">{formatBytes(row.sizeBytes)}</td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">{formatManilaDateTime(row.createdAt)}</td>
                      <td className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            title="Preview"
                            aria-label="Preview file"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            download={row.originalName}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
                            title="Download"
                            aria-label="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-signal-red"
                            onClick={() => setPendingDelete(row)}
                            title="Delete"
                            aria-label="Delete file"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 ? (
          <div className="flex flex-col gap-3 border-t-[1.5px] border-line/80 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs">
                {total} {total === 1 ? "file" : "files"}
              </span>
              <select
                className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPageIndex(0);
                }}
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

      {uploadOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30">
          <div className="ml-auto flex h-full w-full max-w-[620px] flex-col border-l-[1.5px] border-line bg-field shadow-overlay">
            <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-2.5">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink"
                onClick={() => setUploadOpen(false)}
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
              <Button
                className="h-8 rounded-md px-3 text-xs"
                icon={uploadMutation.isPending ? <Upload className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
                onClick={submitUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload files"}
              </Button>
            </div>
            <div className="border-b-[1.5px] border-line px-4 py-3 sm:px-5">
              <h3 className="text-[24px] font-bold leading-7 text-ink sm:text-[28px] sm:leading-8">New files</h3>
              <p className="mt-2 text-sm text-slate-600">Add one or more files, then set module and optional owner link.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {uploadError ? <div className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</div> : null}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Module *</span>
                  <select
                    value={uploadForm.module}
                    onChange={(event) => setUploadForm((previous) => ({ ...previous, module: event.target.value }))}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    {moduleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Owner Type</span>
                  <select
                    value={uploadForm.ownerType}
                    onChange={(event) => setUploadForm((previous) => ({ ...previous, ownerType: event.target.value }))}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
                  >
                    {ownerTypeOptions.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Owner ID (Optional)</span>
                  <Input
                    value={uploadForm.ownerId}
                    onChange={(event) => setUploadForm((previous) => ({ ...previous, ownerId: event.target.value }))}
                    placeholder="Example: employee id, payroll id, leave id"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">Files *</span>
                  <label
                    htmlFor="files-input"
                    className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:border-brand-500 hover:text-brand-700"
                  >
                    <Upload className="h-4 w-4" />
                    Choose files
                    <input
                      id="files-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        if (!files.length) return;
                        setSelectedFiles((previous) => [...previous, ...files]);
                      }}
                    />
                  </label>
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">Selected files</p>
                  <span className="text-xs text-slate-500">{selectedFiles.length}</span>
                </div>
                <div className="max-h-[320px] space-y-1 overflow-y-auto border border-line bg-white p-2">
                  {selectedFiles.length ? (
                    selectedFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">{file.name}</div>
                          <div className="text-xs text-slate-500">
                            {formatBytes(file.size)} • {file.type || "unknown"}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-signal-red"
                          onClick={() =>
                            setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))
                          }
                          aria-label="Remove selected file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="px-2 py-2 text-sm text-slate-500">No files selected yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete file?"
        description={
          pendingDelete
            ? `This will permanently remove "${pendingDelete.originalName}" from file storage.`
            : ""
        }
        confirmLabel="Delete"
        isConfirming={deleteMutation.isPending}
        onConfirm={() => (pendingDelete ? deleteMutation.mutateAsync(pendingDelete.id).then(() => undefined) : Promise.resolve())}
        onCancel={() => {
          if (deleteMutation.isPending) return;
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

function FilesTableSkeleton() {
  const headers = ["File Name", "Module", "Owner", "Type", "Size", "Uploaded", "Actions"];
  return (
    <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
      <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                className={[
                  "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500",
                  index === 0 ? "rounded-l-md border-l" : "",
                  index === headers.length - 1 ? "rounded-r-md border-r" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, rowIndex) => (
            <tr key={`file-skeleton-${rowIndex}`}>
              {headers.map((header, colIndex) => (
                <td key={`${header}-${colIndex}`} className="border-b border-line/80 px-4 py-3">
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

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${size.toFixed(size >= 100 ? 0 : 1)} ${unit}`;
}

function formatManilaDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function humanizeToken(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveFileUrl(apiOrigin: string, relativePath: string) {
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  if (relativePath.startsWith("/")) {
    return apiOrigin ? `${apiOrigin}${relativePath}` : relativePath;
  }
  return apiOrigin ? `${apiOrigin}/${relativePath}` : `/${relativePath}`;
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
