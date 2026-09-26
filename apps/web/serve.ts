import handler from "./dist/server/server.js";

const clientDir = `${import.meta.dir}/dist/client`;
const port = Number(process.env.PORT ?? 3000);
// Same-origin API: with API_ORIGIN set (prod), /api/* and /openapi are proxied to the
// API app over Fly private networking so auth cookies stay first-party (SameSite=Lax) —
// *.fly.dev is on the Public Suffix List, so cross-subdomain cookies can never work.
const apiOrigin = process.env.API_ORIGIN;

// ponytail: no CSP here on purpose — the SPA loads R2 attachments, streams chat SSE and
// bounces through OAuth redirects, so a wrong directive breaks the product silently. These
// four are the clickjacking/sniffing/referrer-leak fixes and cost nothing. Add a CSP once
// there's a staging env to prove it against. SAMEORIGIN, not DENY: document previews frame
// same-origin blobs.
const securityHeaders: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
};

function secure(response: Response) {
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  return response;
}

function isPublicDocumentPath(pathname: string) {
  return pathname.startsWith("/view/") || pathname.startsWith("/api/documents/view/");
}

function securePublicDocument(response: Response) {
  secure(response);
  response.headers.set("cache-control", "private, no-store");
  response.headers.set("referrer-policy", "no-referrer");
  response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  return response;
}

Bun.serve({
  port,
  // Chat SSE proxies through here and goes quiet while an LLM round or a tool call
  // runs; Bun's 10s default hangs up mid-stream and the browser reports
  // ERR_HTTP2_PROTOCOL_ERROR on a 200. Matches the API's own idleTimeout.
  idleTimeout: 255,
  async fetch(req) {
    const { pathname, search } = new URL(req.url);
    // /mcp is proxied too — Settings copies an MCP URL on this origin (VITE_API_URL)
    if (apiOrigin && (pathname.startsWith("/api/") || pathname === "/openapi" || pathname.startsWith("/openapi/") || pathname === "/mcp" || pathname.startsWith("/mcp/"))) {
      // Every API deploy replaces the machine behind mana-api.internal, and a pooled keep-alive
      // socket to the dead one blackholes over 6PN instead of erroring — requests hang for minutes.
      // ponytail: fresh connection per proxied request; swap API_ORIGIN to mana-api.flycast (stable
      // address, so pooling is safe again) if the in-region handshake ever shows up in latency.
      const headers = new Headers(req.headers);
      headers.set("connection", "close");
      const response = await fetch(new URL(pathname + search, apiOrigin), {
        method: req.method,
        headers,
        body: req.body,
        // OAuth callbacks answer with 302s that must reach the browser, not be followed here
        redirect: "manual",
      });
      return isPublicDocumentPath(pathname) ? securePublicDocument(response) : secure(response);
    }
    // static-first: the TanStack Start server bundle does not serve assets in production
    if (pathname !== "/" && !pathname.includes("..")) {
      const file = Bun.file(clientDir + pathname);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            ...securityHeaders,
            "cache-control": pathname.startsWith("/assets/")
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          },
        });
      }
    }
    const response = await handler.fetch(req);
    return isPublicDocumentPath(pathname) ? securePublicDocument(response) : secure(response);
  },
});

console.log(`web listening on :${port}`);
