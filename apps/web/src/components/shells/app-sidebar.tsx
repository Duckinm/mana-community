import { FeedbackModal } from "@/components/feedback/feedback-modal";
import {
  BookOpen,
  Home,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileSignature,
  FolderOpen,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "@/components/icons";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GetStartedChecklist } from "@/components/onboarding/get-started-checklist";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import type { NewProjectInput } from "@/components/projects/new-project-types";
import { AiChatTrigger } from "@/components/shells/ai-chat-trigger";
import { NavItem, SectionLabel } from "@/components/shells/nav-item";
import { ProjectPicker } from "@/components/shells/project-picker";
import {
  ProjectSubNav,
  type SubTab,
} from "@/components/shells/project-sub-nav";
import { SidebarBrand } from "@/components/shells/sidebar-brand";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjects } from "@/context/projects";
import { useSidebar } from "@/context/sidebar";
import { createProjectWithDetails } from "@/lib/create-project-with-details";
import { landingUrl } from "@/lib/landing-url";
import { sidebarRowHoverHandlers } from "@/lib/sidebar-row-hover";
import { cn } from "@/lib/utils";
import { setActiveProjectId, useActiveProjectId } from "@/lib/active-project";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const ACCOUNTING_NAV_OPEN_KEY = "fos:accounting-nav-open";

function FeedbackNavButton({
  collapsed,
  label,
  onClick,
}: {
  collapsed: boolean;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <button
      onClick={onClick}
      className="flex items-center px-2.5 h-8 gap-2.5 rounded-md transition-colors mx-2 w-[calc(100%-16px)]"
      style={{ color: "var(--text-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--border-subtle)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <MessageSquare size={16} strokeWidth={1.5} className="shrink-0" />
      <span
        className="text-[0.8125rem] font-normal whitespace-nowrap overflow-hidden flex-1 text-left transition-[max-width,opacity]"
        style={{
          maxWidth: collapsed ? 0 : 180,
          opacity: collapsed ? 0 : 1,
          transitionDuration: "220ms, 150ms",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1), ease",
        }}
      >
        {label}
      </span>
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getActiveTab(pathname: string): SubTab {
  if (
    pathname.includes("/issues") ||
    pathname.includes("/board") ||
    pathname.includes("/table")
  )
    return "issues";
  if (pathname.includes("/reports")) return "reports";
  return "overview";
}

export function AppSidebar() {
  const { t } = useTranslation("nav");
  const { collapsed: userCollapsed, toggle } = useSidebar();
  const {
    projects,
    trashedProjects,
    loading: projectsLoading,
    addProject,
  } = useProjects();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { projectId: activeProjectId } = useParams({ strict: false }) as {
    projectId?: string;
  };
  const storedActiveProjectId = useActiveProjectId();

  const [showModal, setShowModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [accountingOpen, setAccountingOpen] = useState(
    () => localStorage.getItem(ACCOUNTING_NAV_OPEN_KEY) !== "0",
  );

  const isOnChat = pathname === "/chat" || pathname.startsWith("/chat/");
  const isOnProjectsSection =
    pathname === "/projects" || pathname.startsWith("/projects/");
  const isOnAccountingSection =
    pathname === "/accounting" || pathname.startsWith("/accounting/");
  const activeTab = getActiveTab(pathname);
  const activeProjects = projects.filter((p) => !p.archived);

  useEffect(() => {
    if (activeProjectId) setActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (isOnProjectsSection) setProjectsOpen(true);
  }, [isOnProjectsSection]);

  useEffect(() => {
    localStorage.setItem(ACCOUNTING_NAV_OPEN_KEY, accountingOpen ? "1" : "0");
  }, [accountingOpen]);

  const resolvedProjectId =
    activeProjectId ?? storedActiveProjectId ?? activeProjects[0]?.id;
  const activeProject = activeProjects.find((p) => p.id === resolvedProjectId);
  const collapsed = userCollapsed || isNarrow;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Picking a project only re-scopes project-bound views (e.g. the calendar
  // to-do panel). Navigate only inside the projects section, where the page
  // content is bound to the URL param.
  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    if (isOnProjectsSection) {
      navigate({
        to: "/projects/$projectId/overview",
        params: { projectId: id },
      });
    }
  };

  // Parents with children only expand/collapse — the user picks the child to
  // navigate. Exception: with no projects yet there is nothing to expand, so
  // fall through to the projects empty state.
  const handleToggleProjects = () => {
    if (!activeProject) {
      navigate({ to: "/projects" });
      return;
    }
    setProjectsOpen((o) => !o);
  };

  const handleToggleAccounting = () => {
    setAccountingOpen((open) => !open);
  };

  const handleCreateProject = async (input: NewProjectInput) => {
    const created = await createProjectWithDetails(addProject, input);
    setShowModal(false);
    setActiveProjectId(created.id);
    navigate({
      to: "/projects/$projectId/overview",
      params: { projectId: created.id },
    });
  };

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className="relative z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-card xl:flex"
        style={{
          width: collapsed ? "3.5rem" : "16.1875rem",
        }}
      >
        <div
          className={cn(
            "shrink-0 border-b border-border",
            collapsed
              ? "flex flex-col items-center gap-2 px-2 py-3"
              : "flex items-center justify-between gap-2 px-3 py-3",
          )}
        >
          <SidebarBrand collapsed={collapsed} />
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AiChatTrigger collapsed isActive={isOnChat} />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t("chatWithAi")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <AiChatTrigger isActive={isOnChat} />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          <div
            className={cn(
              collapsed ? "flex flex-col items-center px-2 mb-2" : "px-3 mb-3",
            )}
          >
            <ProjectPicker
              projects={projects}
              trashedProjects={trashedProjects}
              loading={projectsLoading}
              activeProject={activeProject}
              collapsed={collapsed}
              onSelect={handleSelectProject}
              onNewProject={() => setShowModal(true)}
              onOpenArchive={() => void navigate({ to: "/projects/recovery" })}
              onOpenTrash={() => void navigate({ to: "/projects/recovery" })}
            />
          </div>

          <SectionLabel label={t("workspace")} collapsed={collapsed} />
          <NavItem to="/home" icon={Home} label={t("home")} isActive={pathname === "/home"} collapsed={collapsed} />
          <ProjectSubNav
            collapsed={collapsed}
            isOnProjectsSection={isOnProjectsSection}
            activeProject={activeProject}
            projectsOpen={projectsOpen}
            activeTab={activeTab}
            onToggle={handleToggleProjects}
          />
          <NavItem
            to="/calendar"
            icon={Calendar}
            label={t("calendar")}
            isActive={isActive("/calendar")}
            collapsed={collapsed}
          />
          <NavItem
            to="/documents"
            icon={FileSignature}
            label={t("documents")}
            isActive={isActive("/documents") && !isActive("/documents/library")}
            collapsed={collapsed}
          />
          <button
            className="flex items-center gap-2.5 rounded-md transition-colors mx-2"
            style={{
              height: 36,
              width: "calc(100% - 16px)",
              paddingLeft: 10,
              paddingRight: 10,
              color: isOnAccountingSection
                ? "var(--text-primary)"
                : "var(--text-muted)",
              background: isOnAccountingSection
                ? "var(--primary-soft)"
                : "transparent",
            }}
            {...sidebarRowHoverHandlers}
            onClick={handleToggleAccounting}
          >
            <TrendingUp
              size={16}
              strokeWidth={isOnAccountingSection ? 2 : 1.5}
              className="shrink-0"
            />
            {!collapsed && (
              <>
                <span className="text-[0.8125rem] font-medium flex-1 text-left">
                  {t("accounting")}
                </span>
                {accountingOpen ? (
                  <ChevronDown size={13} className="shrink-0" />
                ) : (
                  <ChevronRight size={13} className="shrink-0" />
                )}
              </>
            )}
          </button>
          <div
            className="transition-[grid-template-rows]"
            style={{
              display: "grid",
              gridTemplateRows: accountingOpen && !collapsed ? "1fr" : "0fr",
              transitionDuration: "200ms",
              transitionTimingFunction: "cubic-bezier(0.77,0,0.175,1)",
            }}
          >
            <div className="overflow-hidden">
              <ul
                className="flex flex-col list-none gap-y-px py-1 border-l border-border"
                style={{ marginLeft: 26, marginRight: 8, paddingLeft: 8 }}
              >
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
                    <li key={to}>
                      <button
                        className={`flex items-center w-full rounded-md px-2 transition-colors text-[0.8125rem] ${active ? "font-semibold text-foreground bg-primary-soft" : "font-normal text-muted-foreground hover:bg-border-subtle"}`}
                        style={{ minHeight: 34 }}
                        onClick={() => navigate({ to })}
                      >
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <SectionLabel label={t("administrator")} collapsed={collapsed} />
          <NavItem
            to="/contacts"
            icon={Users}
            label={t("contacts")}
            isActive={isActive("/contacts")}
            collapsed={collapsed}
          />
          <NavItem
            to="/storage"
            icon={FolderOpen}
            label={t("assets")}
            isActive={isActive("/storage")}
            collapsed={collapsed}
          />
          <NavItem
            to="/documents/library/templates"
            icon={BookOpen}
            label={t("library")}
            isActive={isActive("/documents/library")}
            collapsed={collapsed}
          />
          <div className="mx-4 my-3 h-px bg-border" />
          <GetStartedChecklist collapsed={collapsed} />
          <NavItem
            to="/settings"
            icon={Settings}
            label={t("settings")}
            isActive={isActive("/settings")}
            collapsed={collapsed}
          />
          <FeedbackNavButton
            collapsed={collapsed}
            label={t("feedback")}
            onClick={() => setShowFeedback(true)}
          />
          <NavItem
            to={landingUrl("/faqs")}
            icon={CircleHelp}
            label={t("faqs")}
            isActive={false}
            collapsed={collapsed}
          />
          <NavItem
            to={landingUrl("/privacy-policy")}
            icon={Shield}
            label={t("privacyPolicy")}
            isActive={false}
            collapsed={collapsed}
          />
        </nav>

        <div
          className={cn(
            "shrink-0 flex items-center border-t border-border",
            collapsed
              ? "flex-col justify-center gap-1 py-2"
              : "h-12 justify-between px-2",
          )}
        >
          <NotificationBell />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors xl:flex"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--surface-raised)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                {collapsed ? (
                  <PanelLeftOpen size={16} strokeWidth={1.5} />
                ) : (
                  <PanelLeftClose size={16} strokeWidth={1.5} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? t("expandSidebar") : t("collapseSidebar")}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      <FeedbackModal open={showFeedback} onOpenChange={setShowFeedback} />

      {/* Modals / panels */}
      <AnimatePresence>
        {showModal && (
          <NewProjectModal
            onClose={() => setShowModal(false)}
            onCreate={handleCreateProject}
            usedColors={projects.map((p) => p.color)}
          />
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
