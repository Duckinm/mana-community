import { describe, expect, it } from "bun:test";
import { cors } from "@elysiajs/cors";
import Elysia from "elysia";
import { createLandingSessionModule } from "@api/modules/landing-session";
import { env } from "@api/env";

function request(origin: string) {
  return new Request("http://localhost/api/landing-session", {
    headers: { Origin: origin },
  });
}

function appWithRestrictiveGlobalCors(session: unknown = { user: { id: "user-1" } }) {
  return new Elysia()
    .use(cors({ origin: () => false, credentials: true }))
    .use(createLandingSessionModule(async () => session));
}

describe("GET /api/landing-session", () => {
  it("returns only the active-session boolean to the configured landing origin", async () => {
    const app = appWithRestrictiveGlobalCors();
    const response = await app.handle(request(env.LANDING_URL));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.headers.get("access-control-allow-origin")).toBe(env.LANDING_URL);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed for every other origin", async () => {
    const app = appWithRestrictiveGlobalCors();
    const response = await app.handle(request("https://example.com"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("returns false when the app session is absent", async () => {
    const response = await appWithRestrictiveGlobalCors(null).handle(request(env.LANDING_URL));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
  });
});
