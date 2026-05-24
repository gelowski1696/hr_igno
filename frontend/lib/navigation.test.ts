import { describe, expect, it } from "vitest";

import { filterNavigation, flattenNavigationItems, navigationSections } from "./navigation";

describe("filterNavigation", () => {
  it("shows admin operations to super admins", () => {
    const paths = filterNavigation(navigationSections, "SUPER_ADMIN")
      .flatMap((section) => flattenNavigationItems(section.items))
      .map((item) => item.href)
      .filter((href): href is string => Boolean(href));

    expect(paths).toContain("/admin/employees");
    expect(paths).toContain("/admin/payroll/runs");
    expect(paths).toContain("/admin/users");
  });

  it("hides admin-only pages from employees", () => {
    const paths = filterNavigation(navigationSections, "EMPLOYEE")
      .flatMap((section) => flattenNavigationItems(section.items))
      .map((item) => item.href)
      .filter((href): href is string => Boolean(href));

    expect(paths).toContain("/employee/dashboard");
    expect(paths).not.toContain("/admin/users");
    expect(paths).not.toContain("/admin/payroll/runs");
  });

  it("does not ship duplicate route links", () => {
    const paths = navigationSections
      .flatMap((section) => flattenNavigationItems(section.items))
      .map((item) => item.href)
      .filter((href): href is string => Boolean(href));
    expect(new Set(paths).size).toBe(paths.length);
  });
});
