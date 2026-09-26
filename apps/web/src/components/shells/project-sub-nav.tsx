import type { Project } from "@/components/projects/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sidebarRowHoverHandlers } from "@/lib/sidebar-row-hover";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Kanban } from "@/components/icons";
import { useTranslation } from "react-i18next";

const LAST_ISSUES_VIEW_KEY = "fos:last-issues-view";

const EMPTY_ISSUES_SEARCH = {
  statuses: [] as ("todo" | "in-progress" | "done" | "canceled")[],
  priorities: [] as ("high" | "med" | "low")[],
  tags: [] as string[],
  due: null as "overdue" | "today" | "week" | "month" | null,
  created: null as "today" | "week" | "month" | null,
  milestone: null as string | null,
};

export function getLastIssuesView(projectId: string): "board" | "table" {
  try {
    const raw = localStorage.getItem(`${LAST_ISSUES_VIEW_KEY}:${projectId}`);
    if (raw === "table") return "table";
  } catch {}
  return "board";
}

export function setLastIssuesView(projectId: string, view: "board" | "table") {
  try {
    localStorage.setItem(`${LAST_ISSUES_VIEW_KEY}:${projectId}`, view);
  } catch {}
}

const SUB_TABS = ["overview", "issues", "reports"] as const;

export type SubTab = (typeof SUB_TABS)[number];

export function ProjectSubNav({
  collapsed,
  isOnProjectsSection,
  activeProject,
  projectsOpen,
  activeTab,
  onToggle,
}: {
  collapsed: boolean;
  isOnProjectsSection: boolean;
  activeProject: Project | undefined;
  projectsOpen: boolean;
  activeTab: SubTab;
  onToggle: () => void;
}) {
  const { t } = useTranslation("nav");
  const navigate = useNavigate();
  const showSubItems = !collapsed && !!activeProject && projectsOpen;

  const projectsButton = collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={activeProject ? "/projects/$projectId/overview" : "/projects"}
          params={activeProject ? { projectId: activeProject.id } : undefined}
          className="flex items-center justify-center rounded-md mx-2 transition-colors text-muted-foreground h-8"
          {...sidebarRowHoverHandlers}
        >
          <Kanban size={16} strokeWidth={1.5} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {t("projects")}
      </TooltipContent>
    </Tooltip>
  ) : (
    <button
      className="flex items-center w-[calc(100%-16px)] h-8 px-2.5 gap-2.5 rounded-md transition-colors mx-2"
      style={{
        color: isOnProjectsSection
          ? "var(--text-primary)"
          : "var(--text-muted)",
        background: isOnProjectsSection ? "var(--primary-soft)" : "transparent",
      }}
      {...sidebarRowHoverHandlers}
      onClick={onToggle}
    >
      <Kanban
        size={16}
        strokeWidth={isOnProjectsSection ? 2 : 1.5}
        className="shrink-0"
      />
      <span className="text-[0.8125rem] font-medium flex-1 text-left">
        {t("projects")}
      </span>
      {projectsOpen ? (
        <ChevronDown size={13} className="shrink-0" />
      ) : (
        <ChevronRight size={13} className="shrink-0" />
      )}
    </button>
  );

  return (
    <>
      {projectsButton}

      <div
        className="transition-[grid-template-rows]"
        style={{
          display: "grid",
          gridTemplateRows: showSubItems ? "1fr" : "0fr",
          transitionDuration: "200ms",
          transitionTimingFunction: "cubic-bezier(0.77,0,0.175,1)",
        }}
      >
        <div className="overflow-hidden">
          <ul
            className="flex flex-col list-none gap-y-px py-1 border-l border-border"
            style={{ marginLeft: 26, marginRight: 8, paddingLeft: 8 }}
          >
            {SUB_TABS.map((tab) => {
              const isActive = isOnProjectsSection && activeTab === tab;
              return (
                <li key={tab}>
                  <button
                    className={`flex items-center w-full rounded-md px-2 transition-colors text-[0.8125rem] ${
                      isActive
                        ? "font-semibold text-foreground bg-primary-soft"
                        : "font-normal text-muted-foreground hover:bg-border-subtle"
                    }`}
                    style={{ minHeight: 34 }}
                    onClick={() => {
                      if (tab === "issues") {
                        navigate({
                          to: `/projects/$projectId/issues`,
                          params: { projectId: activeProject!.id },
                          search: EMPTY_ISSUES_SEARCH,
                        });
                      } else {
                        navigate({
                          to: `/projects/$projectId/${tab}`,
                          params: { projectId: activeProject!.id },
                        });
                      }
                    }}
                  >
                    {t(tab === "issues" ? "tasks" : tab)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
