import { TemplateLibraryPanel } from "@/components/documents/library/template-library-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useItemTemplateGroups } from "@/hooks/use-item-template-groups";
import { useItemTemplates } from "@/hooks/use-item-templates";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface ItemLibraryPopoverProps {
  onInsert: (items: { itemDescription: string; qty: number; amount: number }[]) => void;
  currency: string;
}

export function ItemLibraryPopover({ onInsert, currency }: ItemLibraryPopoverProps) {
  const { t } = useTranslation("documents");
  const navigate = useNavigate();
  const { templates } = useItemTemplates();
  const { groups } = useItemTemplateGroups();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"templates" | "packages">("templates");

  const totalCount = templates.length + groups.length;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) setTab("templates");
  }

  function handleInsert(items: { itemDescription: string; qty: number; amount: number }[]) {
    setOpen(false);
    onInsert(items);
  }

  function handleExpand() {
    setOpen(false);
    navigate({ to: "/documents/library/templates", search: { q: "", sort: "name-asc" } });
  }

  return (
    <>
      <Button
        variant="outline"
        size="xs"
        type="button"
        onClick={() => handleOpen(true)}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <BookOpen size={12} />
        {t("itemLibraryPopover.library")}
        {totalCount > 0 && (
          <span className="text-2xs text-muted-foreground/60 font-normal tabular-nums">
            {totalCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent
          className="max-h-[82dvh] max-w-[680px] gap-0 overflow-hidden border border-border bg-surface-card p-0 [&>button:last-child]:hidden"
        >
          <DialogTitle className="sr-only">{t("itemLibraryPopover.itemLibraryTitle")}</DialogTitle>
          <TemplateLibraryPanel
            tab={tab}
            onTabChange={setTab}
            onInsert={handleInsert}
            currency={currency}
            onExpand={handleExpand}
            fitContent
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
