import { describe, expect, it } from "bun:test";
import { planForPriceId } from "@api/modules/billing/service";

describe("planForPriceId", () => {
  it("recognizes grandfathered Solo/Pro price IDs", () => {
    expect(planForPriceId("price_1TolncGY7ZW1aQHHeFj8St55")).toEqual({
      plan: "mana",
      interval: "monthly",
    });
    expect(planForPriceId("price_1TolndGY7ZW1aQHHLEKq9rIK")).toEqual({
      plan: "mana",
      interval: "annual",
    });
    expect(planForPriceId("price_1TolndGY7ZW1aQHHDT3Borru")).toEqual({
      plan: "aether",
      interval: "monthly",
    });
    expect(planForPriceId("price_1TolneGY7ZW1aQHHdSMZilK7")).toEqual({
      plan: "aether",
      interval: "annual",
    });
  });
});
