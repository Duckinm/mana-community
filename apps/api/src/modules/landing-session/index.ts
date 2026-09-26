import { t } from "elysia";
import Elysia from "elysia";
import { auth } from "@api/auth";
import { env } from "@api/env";

type SessionReader = (headers: Headers) => Promise<unknown>;

export function createLandingSessionModule(
  getSession: SessionReader = (headers) => auth.api.getSession({ headers }),
) {
  return new Elysia().get(
    "/api/landing-session",
    async ({ request, set, status }) => {
      const origin = request.headers.get("origin");
      set.headers["cache-control"] = "private, no-store";

      if (origin !== env.LANDING_URL) {
        return status(403, { authenticated: false });
      }

      set.headers["access-control-allow-origin"] = origin;
      set.headers["access-control-allow-credentials"] = "true";
      set.headers.vary = "Origin";

      return { authenticated: Boolean(await getSession(request.headers)) };
    },
    {
      response: {
        200: t.Object({ authenticated: t.Boolean() }),
        403: t.Object({ authenticated: t.Literal(false) }),
      },
      detail: {
        tags: ["Health"],
        summary: "Check whether a landing-page visitor has an active app session",
      },
    },
  );
}

export const landingSessionModule = createLandingSessionModule();
