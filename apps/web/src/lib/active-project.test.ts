import { describe, expect, it } from "vitest";
import { isActiveProject } from "@/lib/active-project";

describe("isActiveProject", () => {
  it("only permits active projects to open a project detail route", () => {
    expect(isActiveProject({ archived: false, deletedAt: null })).toBe(true);
    expect(isActiveProject({ archived: true, deletedAt: null })).toBe(false);
    expect(isActiveProject({ archived: false, deletedAt: "2026-07-31T00:00:00.000Z" })).toBe(false);
  });
});
