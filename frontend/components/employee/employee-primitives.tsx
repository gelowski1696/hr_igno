import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { clsx } from "clsx";

export function EmployeePageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b-[1.5px] border-line pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p> : null}
          <h2 className="mt-1 font-slab text-[26px] font-bold leading-8 text-ink sm:text-[30px] sm:leading-9">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function EmployeeSection({
  title,
  icon,
  subtitle,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("border-[1.5px] border-line bg-white", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-line px-4 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold text-ink">{title}</h3>
        </div>
        {subtitle ? <p className="text-xs font-medium text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmployeeStatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "green" | "amber" | "slate";
}) {
  const toneClass =
    tone === "green"
      ? "text-signal-green"
      : tone === "amber"
        ? "text-signal-amber"
        : tone === "slate"
          ? "text-slate-600"
          : "text-brand-700";

  return (
    <article className="border-[1.5px] border-line bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="font-slab text-3xl font-bold leading-none text-ink">{value}</p>
        {icon ? <span className={clsx("inline-flex h-8 w-8 items-center justify-center", toneClass)}>{icon}</span> : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  );
}

export function EmployeeEmptyState({ label }: { label: string }) {
  return <div className="p-6 text-sm text-slate-600">{label}</div>;
}

export function EmployeeErrorState({ message }: { message: string }) {
  return (
    <div className="border-l-[4px] border-signal-red bg-red-50 p-6 text-sm font-medium text-signal-red">
      {message}
    </div>
  );
}

export function EmployeePageLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function EmployeeTable({
  columns,
  rows,
  emptyLabel,
  renderCardTitle,
  renderCardMeta,
  mobileFieldLimit = 5,
  mobilePriorityKeys = [],
}: {
  columns: Array<{ key: string; label: string; hideOnMobile?: boolean; render: (row: Record<string, unknown>) => ReactNode }>;
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
  renderCardTitle: (row: Record<string, unknown>) => ReactNode;
  renderCardMeta?: (row: Record<string, unknown>) => ReactNode;
  mobileFieldLimit?: number;
  mobilePriorityKeys?: string[];
}) {
  if (!rows.length) {
    return <EmployeeEmptyState label={emptyLabel} />;
  }

  const mobileColumns = prioritizeMobileColumns(columns, mobilePriorityKeys).slice(
    0,
    Math.max(1, mobileFieldLimit),
  );
  const hiddenMobileCount = Math.max(0, columns.filter((column) => !column.hideOnMobile).length - mobileColumns.length);

  return (
    <div className="space-y-3 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="overflow-x-auto">
        <table className="hidden min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm md:table">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={[
                    "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
                    index === 0 ? "rounded-l-md border-l" : "",
                    index === columns.length - 1 ? "rounded-r-md border-r" : "border-r-0",
                    column.hideOnMobile ? "hidden lg:table-cell" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="transition hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td
                    key={`${String(row.id ?? index)}-${column.key}`}
                    className={[
                      "border-b border-line/80 px-4 py-3 align-middle text-slate-700",
                      column.hideOnMobile ? "hidden lg:table-cell" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2.5 md:hidden">
        {rows.map((row, index) => (
          <article key={`card-${String(row.id ?? index)}`} className="overflow-hidden border border-line bg-white">
            <div className="flex items-start justify-between gap-3 border-b border-line bg-muted/50 px-3 py-2">
              <div className="min-w-0 text-sm font-semibold text-ink">{renderCardTitle(row)}</div>
              {renderCardMeta ? <div className="shrink-0 text-xs text-slate-500">{renderCardMeta(row)}</div> : null}
            </div>
            <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
              {mobileColumns
                .map((column) => (
                  <div key={`m-${column.key}`} className="rounded-md border border-line/70 bg-white px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{column.label}</p>
                    <div className="mt-1 min-h-[18px] text-[13px] font-medium leading-5 text-slate-700 break-words">{column.render(row)}</div>
                  </div>
                ))}
            </div>
            {hiddenMobileCount > 0 ? (
              <p className="border-t border-line bg-white px-3 py-2 text-[11px] text-slate-500">
                +{hiddenMobileCount} more field(s) available on larger screens.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function prioritizeMobileColumns(
  columns: Array<{ key: string; label: string; hideOnMobile?: boolean; render: (row: Record<string, unknown>) => ReactNode }>,
  mobilePriorityKeys: string[],
) {
  const visible = columns.filter((column) => !column.hideOnMobile);
  if (!mobilePriorityKeys.length) {
    return visible;
  }

  const rank = new Map<string, number>();
  mobilePriorityKeys.forEach((key, index) => {
    rank.set(key, index);
  });

  return [...visible].sort((left, right) => {
    const leftRank = rank.get(left.key);
    const rightRank = rank.get(right.key);
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return 1;
    if (rightRank === undefined) return -1;
    return leftRank - rightRank;
  });
}
