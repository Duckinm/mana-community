import * as Sentry from "@sentry/tanstackstart-react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// errors only: tracing and replays burn quota fast and the alpha needs neither
// — full error capture with built-in dedupe stays on. PROD is false under
// `vite dev`, so HMR and ssr:false hydration noise stays out of the tracker.
if (dsn && !import.meta.env.SSR && import.meta.env.PROD) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sampleRate: 1,
    tracesSampleRate: 0,
    ignoreErrors: [
      // browser-extension and network noise, not app bugs
      /extension\//i,
      /^chrome:\/\//,
      /^moz-extension:\/\//,
      "ResizeObserver loop",
      "Failed to fetch",
      "Load failed",
      "NetworkError",
      "AbortError",
    ],
  });
}
