"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { toastEventName, type ToastDetail, type ToastTone } from "@/lib/toast";

type ActiveToast = ToastDetail & { expiresAt: number };

export function ToastProvider() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const custom = event as CustomEvent<ToastDetail>;
      const detail = custom.detail;
      if (!detail?.message) return;

      const duration = Number(detail.durationMs) > 0 ? Number(detail.durationMs) : 3200;
      const nextToast: ActiveToast = {
        ...detail,
        durationMs: duration,
        expiresAt: Date.now() + duration,
      };
      setToasts((previous) => [...previous, nextToast].slice(-4));
    }

    window.addEventListener(toastEventName(), onToast as EventListener);
    return () => {
      window.removeEventListener(toastEventName(), onToast as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setToasts((previous) => previous.filter((toast) => toast.expiresAt > now));
    }, 240);
    return () => window.clearInterval(timer);
  }, [toasts.length]);

  const visibleToasts = useMemo(() => toasts.slice(-4), [toasts]);

  if (!visibleToasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[130] flex w-[min(360px,calc(100vw-1.5rem))] flex-col gap-2 sm:right-4 sm:top-4">
      {visibleToasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => setToasts((previous) => previous.filter((item) => item.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ActiveToast; onClose: () => void }) {
  return (
    <div className={toastClass(toast.tone)}>
      <span className="mt-0.5 shrink-0">{toastIcon(toast.tone)}</span>
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-xs font-semibold uppercase tracking-[0.06em]">{toast.title}</p> : null}
        <p className="text-sm font-medium leading-5">{toast.message}</p>
      </div>
      <button
        type="button"
        className="pointer-events-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current/80 hover:bg-black/5 hover:text-current"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function toastClass(tone: ToastTone) {
  if (tone === "success") {
    return "pointer-events-auto flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 shadow";
  }
  if (tone === "error") {
    return "pointer-events-auto flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-red-800 shadow";
  }
  return "pointer-events-auto flex items-start gap-2 border border-sky-200 bg-sky-50 px-3 py-2 text-sky-800 shadow";
}

function toastIcon(tone: ToastTone) {
  if (tone === "success") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  if (tone === "error") {
    return <TriangleAlert className="h-4 w-4" />;
  }
  return <Info className="h-4 w-4" />;
}
