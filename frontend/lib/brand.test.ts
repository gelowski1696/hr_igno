import { describe, expect, it } from "vitest";

import { APP_BRAND, APP_DESCRIPTION, APP_NAME } from "./brand";

describe("brand constants", () => {
  it("uses VMJAMTECH HR as the frontend product name", () => {
    expect(APP_NAME).toBe("VMJAMTECH HR");
    expect(APP_BRAND.shortName).toBe("VMJAMTECH");
    expect(APP_BRAND.productName).toBe("HR");
  });

  it("describes the app without legacy branding", () => {
    const legacyName = ["IG", "NO"].join("");

    expect(APP_DESCRIPTION).toContain("VMJAMTECH HR");
    expect(APP_DESCRIPTION).not.toContain(legacyName);
  });
});
