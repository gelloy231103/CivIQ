import { describe, expect, it } from "vitest";
import { getHeader, isAllowedAdminEmail, parseAdminEmails } from "../../api/_lib/admin-auth";

describe("admin auth helpers", () => {
  it("parses comma, semicolon, and whitespace separated admin emails", () => {
    expect([...parseAdminEmails("One@example.com, two@example.com; three@example.com\n")]).toEqual([
      "one@example.com",
      "two@example.com",
      "three@example.com"
    ]);
  });

  it("checks admin emails case-insensitively", () => {
    expect(isAllowedAdminEmail("Admin@Example.com", "admin@example.com")).toBe(true);
    expect(isAllowedAdminEmail("student@example.com", "admin@example.com")).toBe(false);
  });

  it("reads headers regardless of casing", () => {
    expect(getHeader({ Authorization: "Bearer token" }, "authorization")).toBe("Bearer token");
    expect(getHeader({ authorization: ["Bearer token"] }, "Authorization")).toBe("Bearer token");
  });
});
