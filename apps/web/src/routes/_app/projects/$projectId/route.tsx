import { ProjectLayout } from "@/components/projects/project-layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/$projectId")({
  component: () => <ProjectLayout projectId={Route.useParams().projectId} />,
});
