/**
 * Resolve the API base URL for the current page.
 * When the app is opened from a LAN IP (phone testing) but VITE_API_URL still
 * points at localhost, rewrite the host so fetches hit the machine running the API.
 */
export function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  if (configured === "same-origin") {
    return typeof window === "undefined"
      ? (process.env.API_ORIGIN ?? "http://localhost:4000")
      : window.location.origin;
  }

  if (typeof window === "undefined") return configured;

  const pageHost = window.location.hostname;
  if (pageHost === "localhost" || pageHost === "127.0.0.1") {
    return configured;
  }

  try {
    const url = new URL(configured);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = pageHost;
      return url.origin;
    }
  } catch {
    return configured;
  }

  return configured;
}
