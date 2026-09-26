import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { RedirectLoadingSkeleton } from "@/components/ui/redirect-loading-skeleton";
import { useProjects } from "@/context/projects";
import { resolveActiveProject, useActiveProjectId } from "@/lib/active-project";
import { createProjectWithDetails } from "@/lib/create-project-with-details";
import { FolderKanban, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/projects/")({
  component: ProjectsIndexRedirect,
});

function ProjectsIndexRedirect() {
  const { t } = useTranslation("projects");
  const { projects, loading, isError, refetch, addProject } = useProjects();
  const storedActiveProjectId = useActiveProjectId();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) return <RedirectLoadingSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <QueryErrorPanel onRetry={refetch} className="max-w-md w-full" />
      </div>
    );
  }

  // Redirect only to a live project — projects[0] can be archived/trashed, and the
  // $projectId layout bounces those back here, which looped forever.
  const target = resolveActiveProject(projects, storedActiveProjectId);
  if (target) {
    return (
      <Navigate
        to="/projects/$projectId/overview"
        params={{ projectId: target.id }}
        replace
      />
    );
  }

  return (
    <>
      {modalOpen && (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={async (input) => {
            const created = await createProjectWithDetails(addProject, input);
            setModalOpen(false);
            navigate({
              to: "/projects/$projectId/overview",
              params: { projectId: created.id },
            });
          }}
          usedColors={[]}
        />
      )}
      <EmptyState
        icon={FolderKanban}
        title={t("empty.title")}
        description={t("empty.description")}
        action={<Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5"
        >
          <Plus size={12} />
          {t("empty.newProject")}
        </Button>}
      />
    </>
  );
}
