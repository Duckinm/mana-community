import { useSyncExternalStore } from "react";

export type Consent = "granted" | "denied";

const KEY = "mana-consent";
const listeners = new Set<() => void>();

let cached: Consent | null | undefined;

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  if (cached === undefined) {
    const match = document.cookie.match(/(?:^|;\s*)mana-consent=(granted|denied)/);
    cached = match ? (match[1] as Consent) : null;
  }
  return cached;
}

export function writeConsent(value: Consent) {
  // Scoped to the registrable domain so one answer covers heymana.app and
  // app.heymana.app. localStorage is per-origin and asked the same person twice.
  const shared = location.hostname.endsWith("heymana.app")
    ? "; domain=.heymana.app"
    : "";
  document.cookie = `${KEY}=${value}; path=/; max-age=31536000; SameSite=Lax${shared}`;
  cached = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useConsent() {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}
