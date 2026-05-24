import { describe, expect, it } from "vitest";

import { createApiUrl, normalizeApiError } from "./api";

describe("createApiUrl", () => {
  it("joins an absolute API base and relative path", () => {
    expect(createApiUrl("employees", "http://localhost:3000/api/v1")).toBe(
      "http://localhost:3000/api/v1/employees"
    );
  });

  it("keeps query strings and removes duplicate slashes", () => {
    expect(createApiUrl("/attendance?date=2026-05-08", "http://localhost:3000/api/v1/")).toBe(
      "http://localhost:3000/api/v1/attendance?date=2026-05-08"
    );
  });

  it("supports same-origin API bases for VPS reverse proxy deployments", () => {
    expect(createApiUrl("/auth/me", "/api/v1")).toBe("/api/v1/auth/me");
  });
});

describe("normalizeApiError", () => {
  it("uses backend message text when available", () => {
    expect(normalizeApiError({ message: "Invalid credentials" })).toBe("Invalid credentials");
  });

  it("joins validation message arrays", () => {
    expect(normalizeApiError({ message: ["Email is required", "Password is required"] })).toBe(
      "Email is required, Password is required"
    );
  });
});
