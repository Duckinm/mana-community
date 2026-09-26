import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingProfile,
} from "@/components/onboarding/draft";
import { QuickstartBar } from "@/components/onboarding/quickstart-bar";
import { AppSidebar } from "@/components/shells/app-sidebar";
import { ImpersonationBanner } from "@/components/shells/impersonation-banner";
import { MobileNavigation } from "@/components/shells/mobile-navigation";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContactsProvider } from "@/context/contacts";
import { ProjectsProvider } from "@/context/projects";
import { useSessionContext } from "@/context/session";
import { SettingsProvider } from "@/context/settings";
import { SidebarProvider } from "@/context/sidebar";
import { useAiUsageNudge } from "@/hooks/use-ai-usage-nudge";
import { getSession, getSessionCached } from "@/lib/auth-client";
import { client } from "@/lib/eden";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    // Check for a valid session; redirect to login if none exists. getSessionCached
    // dedupes the network call across rapid re-navigations (this runs on every route
    // change, even hover-preload); a cache miss falls back to one fresh check before
    // giving up, so a single flaky response doesn't kick out a logged-in user.
    let session = await getSessionCached();
    if (!session?.data?.user) {
      session = await getSession();
    }
    if (!session?.data?.user) {
      throw redirect({ to: "/login" });
    }
    return { userId: session.data.user.id };
  },
  // banner outside AppLayout so it also shows over onboarding/loading states
  component: () => (
    <>
      <AppLayout />
      <ImpersonationBanner />
    </>
  ),
});

function AppLayoutInner() {
  useAiUsageNudge();

  return (
    <SidebarProvider>
      {/* Chrome/Android keeps 100dvh above the gesture bar but paints fixed
          elements behind it, exposing a page-coloured strip under the shell. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-card" />
      <div data-app-shell className="flex h-dvh overflow-hidden">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNavigation />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
            <Outlet />
          </main>
        </div>
      </div>
      <QuickstartBar />
      <Toaster
        position="top-center"
        style={{ fontFamily: "var(--font-sans-stack)" }}
      />
    </SidebarProvider>
  );
}

function AppLayout() {
  useSessionContext();
  const { userId } = Route.useRouteContext();
  const onboardedKey = `onboarded:${userId}`;
  const fastLaneKey = 'fast-lane-registration';

  // The wizard itself only opens via the Get Started checklist's "Personalize
  // MANA" step. This just silently reconciles leftover signup-flow state
  // (pre-signup draft answers, fast-lane registration) with the DB so those
  // users don't see "Personalize MANA" as incomplete when they weren't meant to.
  useEffect(() => {
    if (localStorage.getItem(onboardedKey)) return;
    client.api.users.me
      .get()
      .then(async ({ data }) => {
        if (data?.onboardedAt) {
          localStorage.setItem(onboardedKey, "1");
          return;
        }
        const draft = loadOnboardingDraft();
        if (draft) {
          await saveOnboardingProfile(draft).catch(() => {});
          clearOnboardingDraft();
          localStorage.setItem(onboardedKey, "1");
        } else if (localStorage.getItem(fastLaneKey)) {
          await saveOnboardingProfile({}).catch(() => {});
          localStorage.removeItem(fastLaneKey);
          localStorage.setItem(onboardedKey, "1");
        }
      })
      .catch(() => {});
  }, [onboardedKey]);

  return (
    <TooltipProvider>
      <MotionConfig reducedMotion="user">
        <SettingsProvider>
          <ContactsProvider>
            <ProjectsProvider>
              <AppLayoutInner />
            </ProjectsProvider>
          </ContactsProvider>
        </SettingsProvider>
      </MotionConfig>
    </TooltipProvider>
  );
}
