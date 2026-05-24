import { beforeEach, describe, expect, it } from "vitest";

import {
  getStoredSidebarCollapsed,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  setStoredSidebarCollapsed
} from "./sidebar-preferences";

describe("sidebar preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to expanded when no preference exists", () => {
    expect(getStoredSidebarCollapsed()).toBe(false);
  });

  it("persists collapsed and expanded states", () => {
    setStoredSidebarCollapsed(true);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("true");
    expect(getStoredSidebarCollapsed()).toBe(true);

    setStoredSidebarCollapsed(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("false");
    expect(getStoredSidebarCollapsed()).toBe(false);
  });
});
