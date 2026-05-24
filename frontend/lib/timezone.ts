const MANILA_TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET_MINUTES = 8 * 60;

type ManilaDateParts = {
  year: number;
  month: number;
  day: number;
};

function getManilaDateParts(reference = new Date()): ManilaDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(reference);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    const fallback = new Date(reference.getTime() + MANILA_OFFSET_MINUTES * 60_000);
    return {
      year: fallback.getUTCFullYear(),
      month: fallback.getUTCMonth() + 1,
      day: fallback.getUTCDate()
    };
  }

  return { year, month, day };
}

export function getManilaDayRange(reference = new Date()) {
  const { year, month, day } = getManilaDateParts(reference);
  const startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - MANILA_OFFSET_MINUTES * 60_000;
  const endMs = startMs + 24 * 60 * 60 * 1000;

  return {
    start: new Date(startMs),
    end: new Date(endMs)
  };
}

export function isDateInManilaDay(value: unknown, reference = new Date()) {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const { start, end } = getManilaDayRange(reference);
  return parsed >= start && parsed < end;
}

