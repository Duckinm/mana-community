import "@/instrument.client";
import { AppErrorFallback } from "@/components/ui/app-error-fallback";
import { AppNotFound } from "@/components/ui/app-not-found";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { documentModalMask, storageFileModalMask } from "./lib/masking-routes";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeMasks: [documentModalMask, storageFileModalMask],
    defaultNotFoundComponent: AppNotFound,
    defaultErrorComponent: AppErrorFallback,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
