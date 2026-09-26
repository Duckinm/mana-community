import { ChevronRight } from "@/components/icons";
import { ProjectDescriptionEditor } from "@/components/projects/project-description-editor";
import type { Project } from "@/components/projects/types";
import { tiptapDocToText, type TiptapDoc } from "@/lib/rich-text";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ProjectDescriptionSection({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (description: TiptapDoc | null) => void;
}) {
  const { t } = useTranslation("projects");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("notes.description")}
        <ChevronRight
          size={13}
          strokeWidth={2}
          className={`shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
        />
      </button>

      {collapsed ? (
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {tiptapDocToText(project.description) || t("notes.addPlaceholder")}
        </p>
      ) : (
        <ProjectDescriptionEditor
          value={project.description}
          onChange={onUpdate}
          placeholder={t("notes.addPlaceholder")}
          projectId={project.id}
          className="mt-1"
        />
      )}
    </div>
  );
}
