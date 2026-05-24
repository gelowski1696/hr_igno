import { format, isValid, parseISO } from "date-fns";

export function getValueByPath(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

export function formatDate(value: unknown, dateFormat = "MMM d, yyyy") {
  if (!value || typeof value !== "string") {
    return "-";
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, dateFormat) : value;
}

export function formatMoney(value: unknown) {
  const amount = Number(value ?? 0);
  if (Number.isNaN(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(value: unknown) {
  const number = Number(value);
  if (Number.isNaN(number)) {
    return "-";
  }
  return new Intl.NumberFormat("en-PH").format(number);
}

export function humanize(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatCell(value: unknown, type = "text") {
  if (type === "raw") {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
  }
  if (type === "person") {
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const firstName = String(record.firstName ?? record.first_name ?? "").trim();
      const lastName = String(record.lastName ?? record.last_name ?? "").trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      return fullName || "-";
    }
    return value ? String(value) : "-";
  }
  if (type === "date") {
    return formatDate(value);
  }
  if (type === "time") {
    return formatDate(value, "h:mm a");
  }
  if (type === "datetime") {
    return formatDate(value, "MMM d, yyyy h:mm a");
  }
  if (type === "currency") {
    return formatMoney(value);
  }
  if (type === "number") {
    return formatNumber(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return humanize(value);
  }
  return String(value);
}
