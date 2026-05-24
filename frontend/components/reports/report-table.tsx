"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type ReportColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

export function ReportTable<T>({
  rows,
  columns,
  rowKey,
  emptyLabel,
  minWidthClassName = "min-w-[1120px]",
}: {
  rows: T[];
  columns: Array<ReportColumn<T>>;
  rowKey: (row: T, index: number) => string | number;
  emptyLabel: string;
  minWidthClassName?: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1);
  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(pageCount - 1, 0));
    }
  }, [pageCount, pageIndex]);

  const start = clampedPageIndex * pageSize;
  const end = start + pageSize;
  const pagedRows = rows.slice(start, end);
  const pageItems = useMemo(() => buildPageItems(clampedPageIndex, pageCount), [clampedPageIndex, pageCount]);

  return (
    <>
      <div className="overflow-x-auto px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3">
        <table className={`${minWidthClassName} w-full border-separate border-spacing-0 text-left text-sm`}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={[
                    "border-y border-line/80 bg-muted px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600",
                    index === 0 ? "rounded-l-md border-l" : "",
                    index === columns.length - 1 ? "rounded-r-md border-r" : "border-r-0",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length ? (
              pagedRows.map((row, index) => (
                <tr key={String(rowKey(row, index))} className="transition hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={`${String(rowKey(row, index))}-${column.key}`} className="border-b border-line/80 px-4 py-3 align-middle text-slate-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="border-b border-line/80 px-4 py-8 text-center text-sm text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t-[1.5px] border-line/80 px-2.5 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-line bg-white px-3 py-2 font-mono text-xs">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
          <select
            className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageIndex(0);
            }}
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
            onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
            disabled={clampedPageIndex === 0}
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
                onClick={() => setPageIndex(item)}
                className={
                  item === clampedPageIndex
                    ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-semibold text-white"
                    : "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                }
              >
                {item + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPageIndex((current) => Math.min(current + 1, pageCount - 1))}
            disabled={clampedPageIndex >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
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
