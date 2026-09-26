import { isPrivateNetworkHost } from "@mana/db/private-network";
import { networkInterfaces } from "os";
import { env } from "@api/env";

const configuredOrigins = env.CORS_ORIGIN.split(",")
  .map((origin: string) => origin.trim())
  .filter(Boolean);

function configuredWebPorts(): number[] {
  const ports = new Set<number>([3000, 3001, 3002]);
  for (const origin of configuredOrigins) {
    try {
      const port = Number(new URL(origin).port || 80);
      if (Number.isFinite(port) && port > 0) ports.add(port);
    } catch {
      // ignore
    }
  }
  return [...ports];
}

function lanWebOrigins(): string[] {
  if (env.NODE_ENV === "production") return [];
  const origins: string[] = [];
  const ports = configuredWebPorts();
  // localhost on every dev port: CORS already allows it via allowOrigin's private-host
  // fallback, but better-auth reads this list and would answer "Invalid origin" without it
  for (const port of ports) {
    origins.push(`http://localhost:${port}`);
  }
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family !== "IPv4" || net.internal) continue;
      for (const port of ports) {
        origins.push(`http://${net.address}:${port}`);
      }
    }
  }
  return origins;
}

/** Static allowlist for better-auth trustedOrigins. */
export function trustedWebOrigins(): string[] {
  return [...new Set([...configuredOrigins, ...lanWebOrigins()])];
}

export function resolveAllowedOrigin(
  requestOrigin: string,
  trustedOrigins: string[],
  production: boolean,
): string | false {
  if (trustedOrigins.includes(requestOrigin)) return requestOrigin;

  if (production) return false;

  try {
    const url = new URL(requestOrigin);
    if (!isPrivateNetworkHost(url.hostname)) return false;
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return requestOrigin;
  } catch {
    return false;
  }
}

function allowOrigin(requestOrigin: string): string | false {
  return resolveAllowedOrigin(requestOrigin, trustedWebOrigins(), env.NODE_ENV === "production");
}

/**
 * Elysia CORS `origin` callback receives the Request.
 * In development, also allow private-network hosts for phone-on-LAN testing.
 */
export function corsOrigin(request: Request): boolean {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return true;
  return allowOrigin(requestOrigin) !== false;
}
