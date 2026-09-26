import { OverviewTab } from "@/components/projects/overview-tab";
import { useProjects } from "@/context/projects";
import { useProjectActions } from "@/context/projects/project-actions-context";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/$projectId/overview")({
  component: OverviewPage,
});

function OverviewPage() {
  const { projectId } = Route.useParams();
  const { projects } = useProjects();
  const actions = useProjectActions();
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  return (
    <OverviewTab
      project={project}
      onUpdateProject={actions.updateProject}
      onArchiveToggle={actions.archiveToggle}
      onDuplicate={actions.duplicate}
      onDelete={actions.deleteProject}
    />
  );
}
