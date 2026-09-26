// @vitest-environment-options { "url": "https://app.heymana.app/" }
import { readConsent, writeConsent } from "@/lib/consent";
import { describe, expect, it, vi } from "vitest";

describe("writeConsent", () => {
  it("scopes the answer to .heymana.app so the landing site and the app share it", () => {
    const spy = vi.spyOn(Object.getPrototypeOf(document), "cookie", "set");

    writeConsent("granted");

    expect(spy.mock.calls[0][0]).toContain("domain=.heymana.app");
    // jsdom drops a cookie whose Domain does not cover the host, so a readable
    // value proves the attribute is accepted, not merely well-formed.
    expect(document.cookie).toContain("mana-consent=granted");
    expect(readConsent()).toBe("granted");

    spy.mockRestore();
  });
});
