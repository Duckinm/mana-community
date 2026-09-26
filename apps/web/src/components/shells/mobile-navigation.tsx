import { FeedbackModal } from "@/components/feedback/feedback-modal";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FolderOpen,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "@/components/icons";
import { GetStartedChecklist } from "@/components/onboarding/get-started-checklist";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import type { NewProjectInput } from "@/components/projects/new-project-types";
import { MobileDock } from "@/components/shells/mobile-dock";
import { MobileHeadline } from "@/components/shells/mobile-headline";
import { ProjectMobileTabBar } from "@/components/shells/project-mobile-tab-bar";
import { Sheet } from "@/components/ui/sheet";
import { useProjects } from "@/context/projects";
import { setActiveProjectId, useActiveProjectId } from "@/lib/active-project";
import { createProjectWithDetails } from "@/lib/create-project-with-details";
import { landingUrl } from "@/lib/landing-url";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import type { ElementType } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const ACCOUNTING_NAV_OPEN_KEY = "fos:accounting-nav-open";

/** Lets a page's back control return to the menu, which is a sheet, not a route. */
export const NAV_MENU_OPEN_EVENT = "mana:open-nav-menu";

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        {children}
      </div>
    </section>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  isActive,
  showBorder,
  onNavigate,
}: {
  to: string;
  icon: ElementType;
  label: string;
  isActive: boolean;
  showBorder?: boolean;
  onNavigate?: () => void;
}) {
  const isExternal = to.startsWith("http");
  const sharedProps = {
    onClick: onNavigate,
    "aria-current": isActive ? ("page" as const) : undefined,
    className: cn(
      "flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors",
      showBorder && "border-t border-border-subtle",
      isActive
        ? "bg-primary-soft"
        : "hover:bg-surface-raised active:bg-surface-raised",
    ),
  };
  const inner = (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          isActive
            ? "border border-primary-border bg-primary-soft text-primary"
            : "bg-surface-raised text-muted-foreground",
        )}
      >
        <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-left text-sm",
          isActive
            ? "font-semibold text-foreground"
            : "font-medium text-foreground",
        )}
      >
        {label}
      </span>
    </>
  );

  if (isExternal) {
    return (
      <a href={to} target="_blank" rel="noreferrer" {...sharedProps}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to} {...sharedProps}>
      {inner}
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  isActive,
  showBorder,
  onClick,
  trailing,
  expanded,
}: {
  icon: ElementType;
  label: string;
  isActive?: boolean;
  showBorder?: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
        showBorder && "border-t border-border-subtle",
        isActive
          ? "bg-primary-soft"
          : "hover:bg-surface-raised active:bg-surface-raised",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          isActive
            ? "border border-primary-border bg-primary-soft text-primary"
            : "bg-surface-raised text-muted-foreground",
        )}
      >
        <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
        {label}
      </span>
      {trailing}
    </button>
  );
}

export function MobileNavigation() {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const storedProjectId = useActiveProjectId();
  const {
    projects,
    trashedProjects,
    loading,
    addProject,
  } = useProjects();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [accountingOpen, setAccountingOpen] = useState(
    () => localStorage.getItem(ACCOUNTING_NAV_OPEN_KEY) !== "0",
  );

  const activeProjects = projects.filter((project) => !project.archived);
  const resolvedProjectId =
    projectId ?? storedProjectId ?? activeProjects[0]?.id;
  const activeProject = activeProjects.find(
    (project) => project.id === resolvedProjectId,
  );
  const isOnChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const isOnProjectsSection =
    pathname === "/projects" || pathname.startsWith("/projects/");
  const isOnProjectDetail = Boolean(projectId);
  const isOnCalendar =
    pathname === "/calendar" || pathname.startsWith("/calendar/");
  const isOnAccountingSection =
    pathname === "/accounting" || pathname.startsWith("/accounting/");
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);
  const showProjectTabs =
    Boolean(resolvedProjectId) && (isOnProjectDetail || isOnCalendar);

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenu() {
    setMenuOpen(true);
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function open() {
      setMenuOpen(true);
    }
    window.addEventListener(NAV_MENU_OPEN_EVENT, open);
    return () => window.removeEventListener(NAV_MENU_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    localStorage.setItem(ACCOUNTING_NAV_OPEN_KEY, accountingOpen ? "1" : "0");
  }, [accountingOpen]);

  function openProject(id: string) {
    setActiveProjectId(id);
    closeMenu();
    void navigate({
      to: "/projects/$projectId/overview",
      params: { projectId: id },
    });
  }

  async function createProject(input: NewProjectInput) {
    const created = await createProjectWithDetails(addProject, input);
    setShowNewProject(false);
    openProject(created.id);
  }

  return (
    <>
      <MobileDock
        isOnChat={isOnChat}
        isOnProjects={isOnProjectsSection}
        isOnDocuments={
          isActive("/documents") && !isActive("/documents/library")
        }
        projects={projects}
        trashedProjects={trashedProjects}
        loading={loading}
        activeProject={activeProject}
        onSelectProject={openProject}
        onNewProject={() => setShowNewProject(true)}
        onOpenArchive={() => void navigate({ to: "/projects/recovery" })}
        onOpenTrash={() => void navigate({ to: "/projects/recovery" })}
        onOpenMenu={() => (menuOpen ? closeMenu() : openMenu())}
        menuOpen={menuOpen}
      />

      {showProjectTabs && resolvedProjectId && (
        <ProjectMobileTabBar projectId={resolvedProjectId} />
      )}

      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="right"
        className="w-full max-w-none border-0 pb-[env(safe-area-inset-bottom)] xl:hidden"
        overlayClassName="xl:hidden"
        contentClassName="overflow-y-auto overscroll-contain"
      >
        {/* Close only — navigating here re-renders the whole route on top of
            the exit animation, which is what made the sheet vanish instead of
            sliding out. */}
        <MobileHeadline
          title={t("menu")}
          onBack={closeMenu}
          backLabel={t("closeMenu")}
        />

        <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-5 sm:px-6">
          <MenuSection title={t("workspace")}>
            <MenuButton
              icon={TrendingUp}
              label={t("accounting")}
              isActive={isOnAccountingSection}
              expanded={accountingOpen}
              onClick={() => setAccountingOpen((open) => !open)}
              trailing={
                accountingOpen ? (
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )
              }
            />
            <div
              className="transition-[grid-template-rows]"
              style={{
                display: "grid",
                gridTemplateRows: accountingOpen ? "1fr" : "0fr",
                transitionDuration: "200ms",
                transitionTimingFunction: "cubic-bezier(0.77,0,0.175,1)",
              }}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border-subtle bg-surface-raised/40 px-2 py-1.5">
                  {[
                    {
                      label: t("accountingOverview"),
                      to: "/accounting" as const,
                    },
                    {
                      label: t("accountingTransactions"),
                      to: "/accounting/transactions" as const,
                    },
                    {
                      label: t("accountingBudgets"),
                      to: "/accounting/budgets" as const,
                    },
                  ].map(({ label, to }) => {
                    const active =
                      to === "/accounting"
                        ? pathname === "/accounting" ||
                          pathname === "/accounting/"
                        : pathname.startsWith(to);
                    return (
                      <button
                        key={to}
                        type="button"
                        onClick={() => {
                          closeMenu();
                          void navigate({ to });
                        }}
                        className={cn(
                          "flex min-h-10 w-full items-center rounded-lg px-3 text-sm transition-colors",
                          active
                            ? "bg-primary-soft font-semibold text-foreground"
                            : "font-medium text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </MenuSection>

          <MenuSection title={t("administrator")}>
            <MenuLink
              to="/contacts"
              icon={Users}
              label={t("contacts")}
              isActive={isActive("/contacts")}
              onNavigate={() => closeMenu()}
            />
            <MenuLink
              to="/storage"
              icon={FolderOpen}
              label={t("assets")}
              isActive={isActive("/storage")}
              showBorder
              onNavigate={() => closeMenu()}
            />
            <MenuLink
              to="/documents/library/templates"
              icon={BookOpen}
              label={t("library")}
              isActive={isActive("/documents/library")}
              showBorder
              onNavigate={() => closeMenu()}
            />
          </MenuSection>

          <div className="-mx-2">
            <GetStartedChecklist collapsed={false} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
            <MenuLink
              to="/settings"
              icon={Settings}
              label={t("settings")}
              isActive={isActive("/settings")}
              onNavigate={() => closeMenu()}
            />
            <MenuButton
              icon={MessageSquare}
              label={t("feedback")}
              showBorder
              onClick={() => {
                closeMenu();
                setShowFeedback(true);
              }}
            />
            <MenuLink
              to={landingUrl("/faqs")}
              icon={CircleHelp}
              label={t("faqs")}
              isActive={false}
              showBorder
              onNavigate={() => closeMenu()}
            />
            <MenuLink
              to={landingUrl("/privacy-policy")}
              icon={Shield}
              label={t("privacyPolicy")}
              isActive={false}
              showBorder
              onNavigate={() => closeMenu()}
            />
          </div>
        </div>
      </Sheet>

      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />

      <AnimatePresence>
        {showNewProject && (
          <NewProjectModal
            onClose={() => setShowNewProject(false)}
            onCreate={createProject}
            usedColors={projects.map((project) => project.color)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
