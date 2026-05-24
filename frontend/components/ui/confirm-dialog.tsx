"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-line bg-white shadow-overlay">
        <div className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-signal-red">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-5">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </button>
          <Button
            variant="danger"
            className="h-9 rounded-md px-3 text-sm"
            onClick={() => {
              void onConfirm();
            }}
            disabled={isConfirming}
          >
            {isConfirming ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

