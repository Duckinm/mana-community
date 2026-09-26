import { BoardTabSkeleton } from "@/components/projects/board-tab-skeleton";
import { OverviewTabSkeleton } from "@/components/projects/overview-tab-skeleton";
import { EntityNotFound } from "@/components/ui/entity-not-found";
import { ReportsTabSkeleton } from "@/components/projects/reports-tab-skeleton";
import { TableTabSkeleton } from "@/components/projects/table-tab-skeleton";
import type { Project, ViewTab } from "@/components/projects/types";
import { getLastIssuesView } from "@/components/shells/project-sub-nav";
import { useProjects } from "@/context/projects";
import { ProjectActionsContext } from "@/context/projects/project-actions-context";
import { isActiveProject, resolveActiveProject, useActiveProjectId } from "@/lib/active-project";
import { Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function ProjectLayout({ projectId }: { projectId: string }) {
  const { t } = useTranslation("projects");
  const { projects, loading: projectsLoading, updateProject, deleteProject, duplicateProject } = useProjects();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isTaskDetail = Boolean(matchRoute({ to: "/projects/$projectId/issues/$taskId", params: { projectId } }));
  const activeTab: ViewTab = matchRoute({ to: "/projects/$projectId/issues", params: { projectId }, fuzzy: true })
    ? "issues"
    : matchRoute({ to: "/projects/$projectId/reports", params: { projectId } })
      ? "reports"
      : "overview";
  const issuesView = activeTab === "issues" ? getLastIssuesView(projectId) : null;
  const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
  const activeProject = projects.find((project) => project.id === projectId);
  const storedActiveProjectId = useActiveProjectId();
  const fallbackProject = resolveActiveProject(projects, storedActiveProjectId);
  const needsFallback = !projectsLoading && !isActiveProject(activeProject);

  useEffect(() => {
    if (needsFallback && fallbackProject) {
      navigate({ to: "/projects/$projectId/overview", params: { projectId: fallbackProject.id }, replace: true });
    }
  }, [needsFallback, fallbackProject?.id, navigate]);

  const pageHeading = activeTab === "reports"
    ? { title: t("pageHeading.reportsTitle"), subtitle: t("pageHeading.reportsSubtitle") }
    : activeTab === "issues"
      ? { title: t("pageHeading.issuesTitle"), subtitle: t("pageHeading.issuesSubtitle") }
      : { title: t("pageHeading.overviewTitle"), subtitle: t("pageHeading.overviewSubtitle") };
  const skeleton = activeTab === "reports"
    ? <ReportsTabSkeleton />
    : activeTab === "issues" && isDesktop && issuesView === "board"
      ? <BoardTabSkeleton />
      : activeTab === "issues"
        ? <TableTabSkeleton />
        : <OverviewTabSkeleton />;

  if (needsFallback) return fallbackProject ? skeleton : <EntityNotFound backTo="/projects" />;

  return (
    <ProjectActionsContext.Provider value={{
      updateProject: (patch: Partial<Project>) => updateProject({ ...patch, id: projectId }),
      archiveToggle: async () => {
        if (!activeProject) return;
        await updateProject({ id: projectId, archived: !activeProject.archived });
        if (!activeProject.archived) await navigate({ to: "/projects", replace: true });
      },
      duplicate: async () => {
        const copy = await duplicateProject(projectId);
        navigate({ to: "/projects/$projectId/overview", params: { projectId: copy.id } });
      },
      deleteProject: async () => {
        await deleteProject(projectId);
        await navigate({ to: "/projects", replace: true });
      },
    }}>
      <div className="flex flex-col h-full">
        <div className="page-scroll pb-24 pt-[calc(3rem+1.5rem+env(safe-area-inset-top))] max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
          <div className="page-pad">
            {!isTaskDetail && (
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3 xl:mb-6">
                <h1 className="text-xl font-semibold text-foreground tracking-tight">{pageHeading.title}</h1>
                <p className="text-xs text-muted-foreground max-xl:sr-only">{pageHeading.subtitle}</p>
              </div>
            )}
            {projectsLoading ? skeleton : <Outlet />}
          </div>
        </div>
      </div>
    </ProjectActionsContext.Provider>
  );
}
