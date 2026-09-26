import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/context/projects";
import { useDocuments } from "@/hooks/use-documents";
import { Folder } from "@/components/icons";
import { useTranslation } from "react-i18next";

interface DocumentProjectPickerProps {
  documentId: string;
  projectId: string | null;
  projectName: string | null;
}

export function DocumentProjectPicker({
  documentId,
  projectId,
  projectName,
}: DocumentProjectPickerProps) {
  const { t } = useTranslation("documents");
  const { projects } = useProjects();
  const { updateDocument } = useDocuments();
  const activeProjects = projects.filter((p) => !p.archived && !p.deletedAt);

  async function handleChange(value: string) {
    const newProjectId = value === "__none__" ? null : value;
    await updateDocument(documentId, { projectId: newProjectId });
  }

  return (
    <Select value={projectId ?? "__none__"} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-auto max-w-[9rem] w-auto shrink-0 gap-1 rounded-md border-0 bg-transparent px-1 py-0.5 text-xs text-muted-foreground shadow-none [@media(pointer:coarse)]:!h-auto hover:bg-surface-raised hover:text-foreground"
      >
        <Folder size={11} className="shrink-0 opacity-60" />
        <SelectValue>
          {projectName ?? (
            <span className="italic opacity-70">
              {t("projectPicker.noProject")}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">
          <span className="italic text-muted-foreground">
            {t("projectPicker.noProject")}
          </span>
        </SelectItem>
        {activeProjects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
