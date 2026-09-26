import { describe, expect, it } from "bun:test";
import { cors } from "@elysiajs/cors";
import Elysia from "elysia";
import { env } from "@api/env";
import { createLandingContactFormModule } from '@api/modules/landing-contact-form'

function request(origin = env.LANDING_URL, ip = crypto.randomUUID(), overrides: Record<string, string> = {}) {
  const body = new FormData();
  Object.entries({
    name: "Mana User",
    email: "hello@example.com",
    topic: "product",
    message: "I would like to understand MANA better.",
    ...overrides,
  }).forEach(([key, value]) => body.set(key, value));

  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { Origin: origin, "x-forwarded-for": ip },
    body,
  });
}

describe("POST /api/contact", () => {
  it("sends a sanitized message only to the fixed support address", async () => {
    let email: { to: string; subject: string; html: string } | undefined;
    const app = new Elysia()
      .use(cors({ origin: () => false }))
      .use(createLandingContactFormModule(async (payload) => {
        email = payload;
        return true;
      }));

    const response = await app.handle(request(env.LANDING_URL, crypto.randomUUID(), {
      name: "<script>alert(1)</script>",
      message: "Hello <img src=x onerror=alert(1)>",
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ submitted: true });
    expect(response.headers.get("access-control-allow-origin")).toBe(env.LANDING_URL);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(email?.to).toBe("support@heymana.app");
    expect(email?.subject).toBe("Landing contact — Product question");
    expect(email?.html).not.toContain("<script>");
    expect(email?.html).not.toContain("<img");
  });

  it("fails closed for other origins", async () => {
    let calls = 0;
    const app = new Elysia().use(createLandingContactFormModule(async () => {
      calls += 1;
      return true;
    }));

    const response = await app.handle(request("https://example.com"));

    expect(response.status).toBe(403);
    expect(calls).toBe(0);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("silently accepts honeypot submissions without sending email", async () => {
    let calls = 0;
    const app = new Elysia().use(createLandingContactFormModule(async () => {
      calls += 1;
      return true;
    }));

    const response = await app.handle(request(env.LANDING_URL, crypto.randomUUID(), { website: "https://spam.example" }));

    expect(response.status).toBe(202);
    expect(calls).toBe(0);
  });

  it("limits repeated messages from one IP", async () => {
    const app = new Elysia().use(createLandingContactFormModule(async () => true));
    const ip = crypto.randomUUID();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await app.handle(request(env.LANDING_URL, ip))).status).toBe(202);
    }

    expect((await app.handle(request(env.LANDING_URL, ip))).status).toBe(429);
  });

  it("reports provider failure without losing the form state", async () => {
    const app = new Elysia().use(createLandingContactFormModule(async () => false));
    const response = await app.handle(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ submitted: false, message: "Message delivery failed" });
  });
});
