import { SettingsHub } from "@/components/settings/settings-hub";
import {
  SETTINGS_NO_SAVE,
  SETTINGS_SECTION_ROUTES,
  SETTINGS_SECTIONS,
  resolveSettingsSectionId,
} from "@/components/settings/settings-sections";
import { ChevronLeft, LogOut } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings } from "@/context/settings";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";
import { fadeIn, motionDurations, motionTransition } from "@/lib/motion";
import { signOutAndSync } from "@/lib/session-sync";
import { cn } from "@/lib/utils";
import {
  Link,
  Outlet,
  useMatches,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { NAV_MENU_OPEN_EVENT } from "@/components/shells/mobile-navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Native drill-down: the hub always lives to the left of a section, so each
// screen enters and leaves on its own side and "back" reads as a slide out to
// the right rather than a cross-fade flash.
const drillTransition = motionTransition(motionDurations.slow);
const drillHub = {
  initial: { opacity: 0, x: "-25%" },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: "-25%" },
  transition: drillTransition,
};
const drillSection = {
  initial: { opacity: 0, x: "25%" },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: "25%" },
  transition: drillTransition,
};

export function SettingsLayout() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const isMobileNav = useIsMobileNav();
  const matches = useMatches();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { saving, triggerSave } = useSettings();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const lastSegment = matches[matches.length - 1]?.routeId.split("/").pop();
  const activeSectionId = resolveSettingsSectionId(lastSegment);
  const isHub = pathname === "/settings" || pathname === "/settings/";
  const activeSection = activeSectionId
    ? SETTINGS_SECTIONS.find((s) => s.id === activeSectionId)
    : undefined;

  useEffect(() => {
    if (!isHub) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    void navigate({ to: "/settings/profile", search: { error: "" }, replace: true });
  }, [isHub, navigate]);

  async function confirmLogout() {
    await signOutAndSync();
    navigate({ to: "/login" });
  }

  return (
    <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock max-xl:pt-0 xl:pb-8 xl:pt-8">
      <div className="page-pad max-xl:flex max-xl:grow max-xl:flex-col">
      <div className="relative mb-5 flex items-center justify-center max-xl:-mx-3 max-xl:min-h-16 max-xl:border-b max-xl:border-border max-xl:bg-card max-xl:px-14 sm:max-xl:-mx-4 xl:min-h-9 xl:justify-start">
        <button
          type="button"
          onClick={() =>
            isHub
              ? window.dispatchEvent(new Event(NAV_MENU_OPEN_EVENT))
              : void navigate({ to: "/settings" })
          }
          className="absolute left-2 flex size-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface-raised xl:hidden"
          aria-label={t("hub.back")}
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <h1 className="truncate text-lg font-semibold tracking-tight text-foreground max-xl:text-center max-xl:text-xl xl:text-left">
          {t("pageTitle")}
        </h1>
      </div>

      <div className="flex flex-col items-start gap-4 max-xl:grow xl:flex-row">
        <aside
          className="hidden w-52 shrink-0 overflow-hidden rounded-xl surface-card xl:sticky xl:top-8 xl:block"
        >
          {SETTINGS_SECTIONS.map(({ id, icon: Icon }, i) => {
            const isActive = activeSectionId === id;
            return (
              <Link
                key={id}
                to={SETTINGS_SECTION_ROUTES[id]}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-base",
                  isActive
                    ? "bg-primary-soft"
                    : "hover:bg-surface-raised",
                )}
                style={{
                  borderBottom:
                    i < SETTINGS_SECTIONS.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                }}
              >
                {isActive && (
                  <span className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    isActive
                      ? "border border-primary-border bg-primary-soft"
                      : "bg-surface-raised",
                  )}
                >
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={
                      isActive ? "text-primary" : "text-muted-foreground"
                    }
                  />
                </div>
                <span
                  className={cn(
                    "truncate text-sm",
                    isActive
                      ? "font-medium text-foreground"
                      : "font-normal text-muted-foreground",
                  )}
                >
                  {t(`sections.${id}.label`)}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="relative flex w-full items-center gap-2.5 border-t border-border-subtle px-3.5 py-2.5 text-left transition-colors duration-base hover:bg-destructive/5"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/10">
              <LogOut
                size={15}
                strokeWidth={1.75}
                className="text-destructive"
              />
            </div>
            <span className="text-sm font-medium text-destructive">
              {t("signOut")}
            </span>
          </button>
        </aside>

        <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("signOutConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("signOutConfirmDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t("signOut")}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <main className="relative w-full min-w-0 flex-1">
          {/* popLayout, not wait: the outgoing screen is pulled out of flow so
              both slide at the same time — a `wait` handoff leaves a blank beat
              that reads as the flash this replaced. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {isHub ? (
              <motion.div
                key="hub"
                className="w-full"
                {...(isMobileNav ? drillHub : fadeIn)}
              >
                <SettingsHub onSignOut={() => setShowLogoutConfirm(true)} />
              </motion.div>
            ) : (
              <motion.div
                key={activeSectionId ?? "settings"}
                className="@container/settings-panel w-full rounded-xl surface-card px-4 pb-5 pt-4 sm:px-5 2xl:px-9"
                {...(isMobileNav ? drillSection : fadeIn)}
              >
                {activeSection && activeSectionId && (
                  <div className="mb-3.5 flex items-center gap-2.5 border-b border-border-subtle pb-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary-border bg-primary-soft">
                      <activeSection.icon
                        size={15}
                        className="text-primary"
                        strokeWidth={2}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-sans text-[0.9375rem] font-semibold tracking-tight text-foreground">
                        {t(`sections.${activeSectionId}.label`)}
                      </h2>
                      <p className="mt-0.5 text-xs text-caption">
                        {t(`sections.${activeSectionId}.sub`)}
                      </p>
                    </div>
                  </div>
                )}
                <Outlet />
                {activeSectionId && !SETTINGS_NO_SAVE.has(activeSectionId) && (
                  <div className="mt-4 flex justify-end border-t border-border-subtle pt-3">
                    <button
                      type="button"
                      onClick={triggerSave}
                      disabled={saving}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                    >
                      {saving ? t("saving") : t("saveChanges")}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      </div>
    </div>
  );
}
