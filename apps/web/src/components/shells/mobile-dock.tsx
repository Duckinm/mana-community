import { FileSignature, Home, List } from "@/components/icons";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ProjectPicker } from "@/components/shells/project-picker";
import type { Project } from "@/components/projects/types";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const dockIconBtn =
  "relative flex size-12 items-center justify-center rounded-full text-foreground/85 transition-colors active:bg-surface-overlay/60";

const HIDE_AFTER = 96;
const SHOW_BELOW = 24;

/** Leaves on the way down, comes back only at the top of the page — reacting to
 *  scroll direction made it ping-pong on every flick. */
function useHideOnScroll(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // A new page starts at the top and may never fire a scroll event, so the
    // dock has to be handed back on navigation or it strands the user.
    setHidden(false);
    if (!enabled) return;
    let hiddenNow = false;
    let selfScroll = false;

    // Pages scroll inside `.page-scroll` containers, not the window, and scroll
    // events don't bubble — capture catches whichever container is moving.
    function onScroll(event: Event) {
      const target = event.target;
      const top =
        target instanceof HTMLElement ? target.scrollTop : window.scrollY;

      // Toggling the dock resizes the page's bottom clearance, so the browser
      // clamps scrollTop at the end of a page — that jump is ours, not a swipe.
      if (selfScroll) {
        selfScroll = false;
        return;
      }
      if (hiddenNow ? top < SHOW_BELOW : top >= HIDE_AFTER) {
        hiddenNow = !hiddenNow;
        selfScroll = true;
        setHidden(hiddenNow);
      }
    }

    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [enabled, pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-dock-hidden", hidden);
    return () => root.removeAttribute("data-dock-hidden");
  }, [hidden]);

  return hidden;
}

export function MobileDock({
  isOnHome,
  isOnProjects,
  isOnDocuments,
  projects,
  trashedProjects,
  loading,
  activeProject,
  onSelectProject,
  onNewProject,
  onOpenArchive,
  onOpenTrash,
  onOpenMenu,
  menuOpen = false,
}: {
  isOnHome: boolean;
  isOnProjects: boolean;
  isOnDocuments: boolean;
  projects: Project[];
  trashedProjects: Project[];
  loading: boolean;
  activeProject: Project | undefined;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onOpenArchive: () => void;
  onOpenTrash: () => void;
  onOpenMenu: () => void;
  menuOpen?: boolean;
}) {
  const { t } = useTranslation("nav");
  const hidden = useHideOnScroll(!menuOpen);

  return (
    <nav
      aria-label={t("navigation")}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center bg-transparent px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none xl:hidden",
        hidden && "translate-y-[calc(100%+1rem)] opacity-0 duration-300",
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-xs items-center gap-2 bg-transparent">
        <div className="flex min-w-0 flex-1 items-center justify-evenly gap-1 rounded-full border border-border-subtle/60 bg-surface-raised/40 px-2 py-2 shadow-popup backdrop-blur-2xl supports-[backdrop-filter]:bg-surface-raised/35">
          <Link
            to="/home"
            aria-label={t("home")}
            aria-current={isOnHome ? "page" : undefined}
            className={cn(
              dockIconBtn,
              isOnHome && "bg-surface-overlay/70 text-foreground",
            )}
          >
            <Home size={20} className="shrink-0" />
          </Link>

          <Link
            to="/documents"
            aria-label={t("documents")}
            aria-current={isOnDocuments ? "page" : undefined}
            className={cn(
              dockIconBtn,
              isOnDocuments && "bg-surface-overlay/70 text-foreground",
            )}
          >
            <FileSignature size={20} strokeWidth={isOnDocuments ? 2.25 : 1.75} />
          </Link>

          <NotificationBell
            side="top"
            align="center"
            className={dockIconBtn}
          />

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("navigation")}
            aria-expanded={menuOpen}
            className={cn(
              dockIconBtn,
              menuOpen && "bg-surface-overlay/70 text-foreground",
            )}
          >
            <List size={20} strokeWidth={1.75} />
          </button>
        </div>

        <ProjectPicker
          dock
          collapsed={false}
          projects={projects}
          trashedProjects={trashedProjects}
          loading={loading}
          activeProject={activeProject}
          onSelect={onSelectProject}
          onNewProject={onNewProject}
          onOpenArchive={onOpenArchive}
          onOpenTrash={onOpenTrash}
          popoverSide="top"
          popoverAlign="center"
          triggerClassName={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-raised/40 text-foreground/85 shadow-popup backdrop-blur-2xl transition-colors supports-[backdrop-filter]:bg-surface-raised/35",
            isOnProjects && "bg-surface-overlay/70 text-foreground",
          )}
        />
      </div>
    </nav>
  );
}
