import { describe, expect, it } from "vitest";

import {
  buildRemoteClockFilename,
  employeeFullName,
  formatCoordinates,
  isClockableEmployee
} from "./remote-clock";

describe("remote clock helpers", () => {
  it("formats coordinates for the backend location payload", () => {
    expect(formatCoordinates({ latitude: 14.554729, longitude: 121.024445 })).toBe("14.554729,121.024445");
  });

  it("uses Manila time when naming captured photos", () => {
    const filename = buildRemoteClockFilename(42, new Date("2026-05-07T16:15:30.000Z"));
    expect(filename).toBe("42_2026-05-08_00-15-30.png");
  });

  it("allows only active employees to clock remotely", () => {
    expect(isClockableEmployee({ status: "ACTIVE" })).toBe(true);
    expect(isClockableEmployee({ status: "INACTIVE" })).toBe(false);
    expect(isClockableEmployee(null)).toBe(false);
  });

  it("combines available employee name parts", () => {
    expect(employeeFullName({ firstName: "Ana", middleName: "D", lastName: "Reyes" })).toBe("Ana D Reyes");
  });
});
