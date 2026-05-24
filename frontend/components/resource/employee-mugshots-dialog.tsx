"use client";

import { AlertTriangle, Camera, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, API_BASE_URL, apiFetch } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";

const imageSlots = [
  { field: "valid_id_1", label: "Valid ID 1" },
  { field: "valid_id_2", label: "Valid ID 2" },
  { field: "mugshot_1", label: "Mugshot 1" },
  { field: "mugshot_2", label: "Mugshot 2" },
  { field: "mugshot_3", label: "Mugshot 3" },
  { field: "mugshot_4", label: "Mugshot 4" },
] as const;

type ImageField = (typeof imageSlots)[number]["field"];

type EmployeeImagesPayload = {
  valid_id_1?: string | null;
  valid_id_2?: string | null;
  mugshot_1?: string | null;
  mugshot_2?: string | null;
  mugshot_3?: string | null;
  mugshot_4?: string | null;
};

type EmployeeMugshotsDialogProps = {
  open: boolean;
  employeeId: number | null;
  employeeLabel?: string;
  onClose: () => void;
  onSaved?: () => void;
};

export function EmployeeMugshotsDialog({
  open,
  employeeId,
  employeeLabel,
  onClose,
  onSaved,
}: EmployeeMugshotsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [serverImages, setServerImages] = useState<Record<ImageField, string | null>>(blankImageMap);
  const [selectedFiles, setSelectedFiles] = useState<Partial<Record<ImageField, File>>>({});
  const [previewImages, setPreviewImages] = useState<Record<ImageField, string | null>>(blankImageMap);
  const objectUrlsRef = useRef<string[]>([]);

  const apiOrigin = useMemo(() => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (!open || !employeeId) {
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError("");
    setSuccess("");
    setSelectedFiles({});

    loadEmployeeImages(employeeId)
      .then((images) => {
        if (!mounted) return;
        setServerImages(images);
        setPreviewImages(mapPreviewImages(images, apiOrigin));
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        const message = loadError instanceof Error ? loadError.message : "Unable to load employee mugshots.";
        setError(message);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiOrigin, employeeId, open]);

  useEffect(() => {
    if (open) return;
    clearObjectUrls(objectUrlsRef.current);
    objectUrlsRef.current = [];
    setServerImages(blankImageMap());
    setPreviewImages(blankImageMap());
    setSelectedFiles({});
    setError("");
    setSuccess("");
  }, [open]);

  if (!open || !employeeId) {
    return null;
  }

  async function handleSave() {
    const formData = new FormData();
    for (const slot of imageSlots) {
      const file = selectedFiles[slot.field];
      if (file) {
        formData.append(slot.field, file);
      }
    }

    if (!Array.from(formData.keys()).length) {
      setError("Select at least one file before saving.");
      setSuccess("");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch<EmployeeImagesPayload>(`employee-images/${employeeId}`, {
        method: "PUT",
        body: formData,
      });

      const normalized = normalizeImagePayload(response);
      setServerImages(normalized);
      setPreviewImages(mapPreviewImages(normalized, apiOrigin));
      setSelectedFiles({});
      setSuccess("Mugshots updated.");
      toastSuccess("Mugshots updated.");
      onSaved?.();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save employee mugshots.";
      setError(message);
      toastError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleFileChange(field: ImageField, file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      setSuccess("");
      toastError("Only image files are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Each image must be 5MB or below.");
      setSuccess("");
      toastError("Each image must be 5MB or below.");
      return;
    }

    setError("");
    setSuccess("");

    setSelectedFiles((previous) => ({
      ...previous,
      [field]: file,
    }));

    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(objectUrl);

    setPreviewImages((previous) => ({
      ...previous,
      [field]: objectUrl,
    }));
  }

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/45 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label="Employee mugshots">
      <div className="mx-auto flex h-full w-full max-w-[1160px] flex-col overflow-hidden border border-line bg-white shadow-overlay">
        <div className="flex items-center justify-between border-b-[1.5px] border-line px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-600">Employee Images</p>
            <h2 className="text-xl font-semibold text-ink">Mugshots</h2>
            <p className="text-sm text-slate-500">{employeeLabel || `Employee #${employeeId}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-9 px-3"
              onClick={onClose}
              disabled={isSaving}
            >
              Close
            </Button>
            <Button
              className="h-9 px-3"
              onClick={handleSave}
              disabled={isSaving}
              icon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              Save
            </Button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-slate-500 hover:bg-slate-100"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="mx-4 mt-4 flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="mx-4 mt-4 flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading mugshots...
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 lg:grid-cols-3">
            {imageSlots.map((slot) => (
              <section key={slot.field} className="space-y-3 border border-line bg-field p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{slot.label}</h3>
                  {selectedFiles[slot.field] ? (
                    <span className="rounded-sm bg-brand-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-700">
                      New
                    </span>
                  ) : null}
                </div>

                <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 border border-dashed border-line bg-white px-3 text-sm font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700">
                  <Upload className="h-4 w-4" />
                  <span>Upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleFileChange(slot.field, event.target.files?.[0])}
                  />
                </label>

                <div className="relative flex h-[230px] items-center justify-center overflow-hidden border border-line bg-white">
                  {previewImages[slot.field] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewImages[slot.field] || ""}
                      alt={slot.label}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">No image yet</span>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function loadEmployeeImages(employeeId: number) {
  try {
    const payload = await apiFetch<EmployeeImagesPayload | null>(`employee-images/${employeeId}`);
    return normalizeImagePayload(payload || {});
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return blankImageMap();
    }
    throw error;
  }
}

function normalizeImagePayload(payload: EmployeeImagesPayload) {
  return {
    valid_id_1: payload.valid_id_1 || null,
    valid_id_2: payload.valid_id_2 || null,
    mugshot_1: payload.mugshot_1 || null,
    mugshot_2: payload.mugshot_2 || null,
    mugshot_3: payload.mugshot_3 || null,
    mugshot_4: payload.mugshot_4 || null,
  } satisfies Record<ImageField, string | null>;
}

function mapPreviewImages(images: Record<ImageField, string | null>, apiOrigin: string) {
  return {
    valid_id_1: resolveImagePath(images.valid_id_1, apiOrigin),
    valid_id_2: resolveImagePath(images.valid_id_2, apiOrigin),
    mugshot_1: resolveImagePath(images.mugshot_1, apiOrigin),
    mugshot_2: resolveImagePath(images.mugshot_2, apiOrigin),
    mugshot_3: resolveImagePath(images.mugshot_3, apiOrigin),
    mugshot_4: resolveImagePath(images.mugshot_4, apiOrigin),
  } satisfies Record<ImageField, string | null>;
}

function resolveImagePath(path: string | null, apiOrigin: string) {
  if (!path) return null;
  if (path.startsWith("data:image/")) return path;
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = normalizeLegacyPath(path);
  if (normalized.startsWith("/")) {
    return apiOrigin ? `${apiOrigin}${normalized}` : normalized;
  }
  return normalized;
}

function normalizeLegacyPath(path: string) {
  if (path.startsWith("/uploads/employee-images/")) {
    return path;
  }
  if (path.startsWith("/employeeImages/") || path.startsWith("employeeImages/")) {
    return `/uploads/employee-images/${path.split("/").pop() || ""}`;
  }
  if (path.startsWith("uploads/employee-images/")) {
    return `/${path}`;
  }
  return path;
}

function blankImageMap() {
  return {
    valid_id_1: null,
    valid_id_2: null,
    mugshot_1: null,
    mugshot_2: null,
    mugshot_3: null,
    mugshot_4: null,
  };
}

function clearObjectUrls(urls: string[]) {
  for (const url of urls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // no-op
    }
  }
}
