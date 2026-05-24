export type ToastTone = "success" | "error" | "info";

export type ToastPayload = {
  tone: ToastTone;
  message: string;
  title?: string;
  durationMs?: number;
};

export type ToastDetail = ToastPayload & {
  id: string;
};

const TOAST_EVENT = "vmjamtech:toast";

function nextToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function emitToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  const detail: ToastDetail = {
    id: nextToastId(),
    durationMs: 3200,
    ...payload,
  };
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }));
}

export function toastSuccess(message: string, title = "Success") {
  emitToast({ tone: "success", title, message });
}

export function toastError(message: string, title = "Action Failed") {
  emitToast({ tone: "error", title, message });
}

export function toastInfo(message: string, title = "Notice") {
  emitToast({ tone: "info", title, message });
}

export function toastEventName() {
  return TOAST_EVENT;
}
