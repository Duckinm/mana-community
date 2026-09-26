import { randomId } from "@/lib/random-id";
import { describe, expect, it } from "vitest";

describe("randomId", () => {
  it("still returns a v4 uuid when randomUUID is missing", () => {
    // randomUUID lives on Crypto.prototype — shadow it with an own property,
    // then drop the shadow, rather than mutating the prototype for everyone.
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });

    try {
      expect(randomId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      Reflect.deleteProperty(crypto, "randomUUID");
    }
  });
});
