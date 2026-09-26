import { describe, expect, it } from "bun:test";
import {
  ANNUAL_FREE_MONTHS,
  PLAN_PRICING_THB,
  getCoreEntitlements,
} from "./plan-entitlements";

describe("plan pricing", () => {
  it("uses Mana 290 and Aether 890 monthly", () => {
    expect(PLAN_PRICING_THB.mana.monthly).toBe(290);
    expect(PLAN_PRICING_THB.aether.monthly).toBe(890);
  });

  it("annual billing is ten months (two months free)", () => {
    expect(ANNUAL_FREE_MONTHS).toBe(2);
    for (const plan of ["mana", "aether"] as const) {
      expect(PLAN_PRICING_THB[plan].annual).toBe(
        PLAN_PRICING_THB[plan].monthly * (12 - ANNUAL_FREE_MONTHS),
      );
    }
  });
});

describe("self-hosted core entitlements", () => {
  it("removes core subscription caps without changing the cloud plan", () => {
    for (const plan of ["free", "mana", "aether"] as const) {
      expect(getCoreEntitlements(plan, "self-hosted")).toEqual({
        projects: null,
        storageBytes: null,
        docsSent: null,
        calendars: null,
        hideBranding: true,
      });
    }
    expect(getCoreEntitlements("free")).toEqual({
      projects: 1,
      storageBytes: 1024 ** 3,
      docsSent: 10,
      calendars: 1,
      hideBranding: false,
    });
    expect(getCoreEntitlements("mana", "cloud").projects).toBe(10);
    expect(getCoreEntitlements("aether", "cloud").storageBytes).toBe(50 * 1024 ** 3);
  });
});
