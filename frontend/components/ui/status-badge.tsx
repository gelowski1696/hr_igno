import { clsx } from "clsx";

const variants: Record<string, string> = {
  ACTIVE: "bg-green-100 text-signal-green",
  APPROVED: "bg-green-100 text-signal-green",
  PAID: "bg-green-100 text-signal-green",
  RELEASED: "bg-green-100 text-signal-green",
  PENDING: "bg-amber-100 text-signal-amber",
  PARTIAL: "bg-amber-100 text-signal-amber",
  PREVIEWED: "bg-blue-100 text-signal-blue",
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-600",
  ENDED: "border-slate-200 bg-slate-50 text-slate-600",
  AWOL: "bg-amber-100 text-signal-amber",
  BLACKLISTED: "bg-red-100 text-signal-red",
  FLOATING: "bg-blue-100 text-signal-blue",
  LEAVE: "bg-blue-100 text-signal-blue",
  NOSCHEDULE: "border-slate-200 bg-slate-50 text-slate-700",
  RESIGNED: "bg-violet-100 text-violet-700",
  TERMINATE: "bg-red-100 text-signal-red",
  REJECTED: "bg-red-100 text-signal-red",
  CANCELLED: "bg-red-100 text-signal-red",
  VOIDED: "bg-red-100 text-signal-red",
  ADMIN_MANUAL: "bg-blue-100 text-signal-blue",
  REMOTE_CLOCK: "bg-green-100 text-signal-green",
  IMPORT: "border-slate-200 bg-slate-50 text-slate-700"
};

export function StatusBadge({ value }: { value: unknown }) {
  const label = String(value || "Unknown").replace(/_/g, " ");
  const key = String(value || "").toUpperCase();

  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 border border-transparent px-2 py-1 text-xs font-bold leading-none",
        variants[key] || "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}
