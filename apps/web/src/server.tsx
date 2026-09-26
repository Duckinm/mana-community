import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

// No server-side Sentry: its fetch wrapper injects <meta name="sentry-trace"> into
// the SSR head, which the client tree never renders — React #418 on every page load.
// Error capture lives in instrument.client.ts.
export default { fetch: createStartHandler(defaultStreamHandler) }
