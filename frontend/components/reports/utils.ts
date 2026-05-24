export function defaultManilaMonthRange(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

export function buildQueryString(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function formatEmployeeOptionLabel(employee: Record<string, unknown>) {
  const code = String(employee.employeeCode || "").trim();
  const firstName = String(employee.firstName || "").trim();
  const lastName = String(employee.lastName || "").trim();
  const store = (employee.store && typeof employee.store === "object" ? (employee.store as Record<string, unknown>) : undefined) || {};
  const area = String(store.area || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const base = code && fullName ? `${code} - ${fullName}` : code || fullName || `Employee ${employee.id}`;
  return area ? `${base} (${area})` : base;
}

export function formatStoreOptionLabel(store: Record<string, unknown>) {
  return String(store.area || store.name || store.code || `Store ${store.id}`);
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
