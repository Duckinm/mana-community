import { Plus } from "@/components/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Document } from "@/components/documents/types";
import { useTranslation } from "react-i18next";

export function TemplateLibraryContextMenu({
  children,
  drafts,
  onSelect,
  actions,
}: {
  children: React.ReactNode;
  drafts: Document[];
  onSelect: (document: Document) => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation("documents");

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions}
        {actions && <ContextMenuSeparator />}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus size={14} strokeWidth={1.75} />
            {t("templateLibrary.insertInto")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {drafts.length === 0 ? (
              <ContextMenuItem disabled>
                {t("templateLibrary.noDraftDocuments")}
              </ContextMenuItem>
            ) : (
              drafts.map((document) => (
                <ContextMenuItem
                  key={document.id}
                  onSelect={() => onSelect(document)}
                >
                  {document.number}
                  {document.clientName ? ` · ${document.clientName}` : ""}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
