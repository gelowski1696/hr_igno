import { apiFetch } from "./api";

export type RemoteClockEmployee = {
  id: number;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  position?: string | null;
  status: string;
  store?: {
    id: number;
    name: string;
    area?: string | null;
  } | null;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type RemoteClockAction = "time-in" | "time-out";

export const GEO_LOCATION_USAGE_EXCEEDED_MESSAGE =
  "GEO Location Usage Exceeded. Please upgrade your plan or buy more credits to continue using GEO Location.";

export function formatCoordinates(point: GeoPoint) {
  return `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
}

export function employeeFullName(employee: Pick<RemoteClockEmployee, "firstName" | "middleName" | "lastName">) {
  return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
}

export function isClockableEmployee(employee: Pick<RemoteClockEmployee, "status"> | null) {
  return employee?.status === "ACTIVE";
}

export function buildRemoteClockFilename(employeeId: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }
      return result;
    }, {});

  return `${employeeId}_${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}.png`;
}

export async function lookupRemoteClockEmployee(employeeCode: string) {
  return apiFetch<RemoteClockEmployee>(`remote-clock/employees/${encodeURIComponent(employeeCode.trim())}`);
}

export async function submitRemoteClock(action: RemoteClockAction, payload: {
  employeeId: number;
  location: string;
  image: File;
}) {
  const formData = new FormData();
  formData.append("employeeId", String(payload.employeeId));
  formData.append("location", payload.location);
  formData.append("image", payload.image, payload.image.name);

  return apiFetch(`remote-clock/${action}`, {
    method: "POST",
    body: formData
  });
}

export async function resolveRemoteClockAddress(location: string) {
  const result = await apiFetch<{ address: string }>(
    `remote-clock/location/resolve?location=${encodeURIComponent(location)}`
  );
  return result.address;
}
