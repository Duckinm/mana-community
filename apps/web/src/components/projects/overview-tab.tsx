import { MilestonesPanel } from "@/components/projects/milestones-panel";
import { ProjectDescriptionSection } from "@/components/projects/project-description-section";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectPropertiesRow } from "@/components/projects/project-properties-row";
import type { Project } from "@/components/projects/types";
import { panelFadeUp } from "@/lib/motion";
import { motion } from "framer-motion";

export function OverviewTab({
  project,
  onUpdateProject,
  onArchiveToggle,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  onUpdateProject: (patch: Partial<Project>) => void;
  onArchiveToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  function linkContact(contactId: string | null) {
    onUpdateProject({ contactId });
  }

  return (
    <motion.div
      key="overview"
      {...panelFadeUp}
      className="space-y-3"
    >
      <ProjectHeader
        project={project}
        onUpdate={onUpdateProject}
        onArchiveToggle={onArchiveToggle}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />

      <ProjectPropertiesRow project={project} onLinkContact={linkContact} />

      <ProjectDescriptionSection
        key={`description-${project.id}`}
        project={project}
        onUpdate={(description) => onUpdateProject({ description })}
      />

      <MilestonesPanel projectId={project.id} />
    </motion.div>
  );
}
