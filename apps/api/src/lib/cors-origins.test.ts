import { describe, expect, it } from "bun:test";
import { env } from "@api/env";
import { corsOrigin, trustedWebOrigins } from "@api/lib/cors-origins";

const isProd = env.NODE_ENV === "production";

describe("trustedWebOrigins", () => {
  it("includes the configured origins", () => {
    for (const origin of env.CORS_ORIGIN.split(",").map((o: string) => o.trim())) {
      expect(trustedWebOrigins()).toContain(origin);
    }
  });

  it.skipIf(isProd)("trusts localhost dev ports so better-auth accepts preflight builds", () => {
    expect(trustedWebOrigins()).toContain("http://localhost:3002");
  });

  it.skipIf(!isProd)("stays limited to the configured origins in production", () => {
    expect(trustedWebOrigins()).toEqual(
      env.CORS_ORIGIN.split(",").map((o: string) => o.trim()),
    );
    expect(
      corsOrigin(new Request("https://x.test", { headers: { origin: "http://localhost:3002" } })),
    ).toBe(false);
  });
});
