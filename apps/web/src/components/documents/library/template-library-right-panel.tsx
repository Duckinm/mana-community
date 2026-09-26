import { PackageDetailPanel } from "@/components/documents/library/package-detail-panel";
import { PackageEditPanel } from "@/components/documents/library/package-edit-panel";
import { TemplateEditPanel } from "@/components/documents/library/template-edit-panel";
import type { RightPanel } from "@/components/documents/library/template-library-types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ItemTemplateGroup } from "@/hooks/use-item-template-groups";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { useTranslation } from "react-i18next";

export function TemplateLibraryRightPanel({
  panel,
  groups,
  templates,
  templateById,
  currency,
  insertMode,
  onClose,
  onEditPackage,
  onInsertGroupAll,
  onInsertGroupSelected,
}: {
  panel: Exclude<RightPanel, { type: "none" }>;
  groups: ItemTemplateGroup[];
  templates: ItemTemplate[];
  templateById: Map<string, ItemTemplate>;
  currency: string;
  insertMode: boolean;
  onClose: () => void;
  onEditPackage: (group: ItemTemplateGroup) => void;
  onInsertGroupAll: (group: ItemTemplateGroup) => void;
  onInsertGroupSelected: (group: ItemTemplateGroup, ids: string[]) => void;
}) {
  const { t } = useTranslation("documents");
  const content = (
    <PanelContent
      panel={panel}
      groups={groups}
      templates={templates}
      templateById={templateById}
      currency={currency}
      insertMode={insertMode}
      onClose={onClose}
      onEditPackage={onEditPackage}
      onInsertGroupAll={onInsertGroupAll}
      onInsertGroupSelected={onInsertGroupSelected}
    />
  );
  const modalTitle =
    panel.type === "template-edit"
      ? t(
          panel.template
            ? "templateLibrary.editTemplate"
            : "templateLibrary.newTemplate",
        )
      : panel.type === "package-edit"
        ? t(
            panel.group
              ? "templateLibrary.editPackage"
              : "templateLibrary.newPackage",
          )
        : panel.group.name;

  if (insertMode) {
    return (
      <div className="absolute inset-0 z-10 flex h-full w-full flex-col overflow-hidden bg-surface-card shadow-xl md:inset-y-0 md:left-auto md:right-0 md:w-[40%] md:min-w-[280px] md:max-w-[520px] md:border-l md:border-border-subtle">
        {content}
      </div>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">{modalTitle}</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
}

function PanelContent({
  panel,
  groups,
  templates,
  templateById,
  currency,
  insertMode,
  onClose,
  onEditPackage,
  onInsertGroupAll,
  onInsertGroupSelected,
}: Omit<Parameters<typeof TemplateLibraryRightPanel>[0], "panel"> & {
  panel: Exclude<RightPanel, { type: "none" }>;
}) {
  if (panel.type === "template-edit") {
    return (
      <TemplateEditPanel
        template={panel.template}
        currency={insertMode ? currency : undefined}
        onBack={onClose}
        hideBack={!insertMode}
      />
    );
  }

  if (panel.type === "package-detail") {
    const group = groups.find((item) => item.id === panel.group.id) ?? panel.group;

    return (
      <PackageDetailPanel
        group={group}
        currency={currency}
        onEdit={() => onEditPackage(panel.group)}
        onBack={onClose}
        onInsertAll={insertMode ? () => onInsertGroupAll(panel.group) : undefined}
        onInsertSelected={
          insertMode ? (ids) => onInsertGroupSelected(panel.group, ids) : undefined
        }
        templateById={templateById}
        hideBack={!insertMode}
      />
    );
  }

  return (
    <PackageEditPanel
      group={panel.group}
      allTemplates={templates}
      onBack={onClose}
      hideBack={!insertMode}
    />
  );
}
