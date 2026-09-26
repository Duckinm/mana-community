import { useSessionContext } from "@/context/session";
import { useConsent } from "@/lib/consent";
import { useRouterState } from "@tanstack/react-router";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;

let started = false;

function startPosthog() {
  if (started || !posthogKey) return;
  started = true;
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "always",
    // The signup funnel starts on heymana.app and finishes here. A host-only cookie
    // would hand PostHog a fresh anonymous id at the subdomain boundary and every
    // landing→signup funnel would read as two unrelated people.
    cross_subdomain_cookie: true,
    // Router navigations never reload the document, so the built-in pageview would
    // fire once and undercount the whole session — the effect below sends them instead.
    capture_pageview: false,
    // Workspace screens show client names and invoice amounts; recording them would
    // ship customer financial data to a third party.
    disable_session_recording: true,
  });
}

export function Analytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isLoading } = useSessionContext();
  const consent = useConsent();
  const identified = useRef(false);
  const isPublicDocumentRoute = pathname.startsWith("/view/");

  useEffect(() => {
    if (isPublicDocumentRoute || !posthogKey || consent !== "granted") return;
    startPosthog();
    posthog.capture("$pageview");
  }, [consent, isPublicDocumentRoute, pathname]);

  useEffect(() => {
    if (isPublicDocumentRoute || !posthogKey || consent !== "granted" || isLoading) return;
    if (user) {
      posthog.identify(user.id, { email: user.email });
      identified.current = true;
    } else if (identified.current) {
      posthog.reset();
      identified.current = false;
    }
  }, [consent, isLoading, isPublicDocumentRoute, user]);

  return null;
}
