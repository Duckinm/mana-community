import { ProjectRecoveryPage } from "@/components/projects/project-recovery-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/projects/recovery")({
  component: ProjectRecoveryPage,
});
