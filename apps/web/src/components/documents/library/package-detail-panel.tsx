import { colorFor } from "@/components/documents/library/group-colors";
import { TemplateThumb } from "@/components/documents/library/template-gallery-card";
import {
  formatPrice,
  formatQty,
} from "@/components/documents/library/template-helpers";
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  useItemTemplateGroups,
  type ItemTemplateGroup,
} from "@/hooks/use-item-template-groups";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PackageDetailPanel({
  group,
  currency,
  onEdit,
  onBack,
  onInsertAll,
  onInsertSelected,
  templateById,
  hideBack,
}: {
  group: ItemTemplateGroup;
  currency: string;
  onEdit: () => void;
  onBack: () => void;
  /** Present in insert mode. When absent, panel is view-only. */
  onInsertAll?: () => void;
  onInsertSelected?: (ids: string[]) => void;
  templateById: Map<string, ItemTemplate>;
  /** Hide the back arrow — modal host provides its own close button. */
  hideBack?: boolean;
}) {
  const { removeMember } = useItemTemplateGroups();
  const { t } = useTranslation("documents");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const color = colorFor(group.color);
  const insertMode = !!onInsertAll;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 border-b border-border-subtle flex-shrink-0",
          hideBack && "pr-12",
        )}
      >
        {!hideBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color.bg}`}
        >
          {group.icon ? (
            <span className="text-base leading-none">{group.icon}</span>
          ) : (
            <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {group.name}
          </p>
          {group.description && (
            <p className="text-xs text-muted-foreground truncate">
              {group.description}
            </p>
          )}
        </div>
        {!insertMode && (
          <button
            type="button"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-surface-raised flex-shrink-0"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {group.templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
            <p className="text-sm text-muted-foreground">
              {t("templateLibrary.noItemsInPackage")}
            </p>
            {!insertMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="gap-1.5"
              >
                <Plus size={12} />
                {t("templateLibrary.addItems")}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {group.templates.map((t) => {
              const isSel = insertMode && selected.has(t.id);
              return (
                <div
                  key={t.id}
                  onClick={insertMode ? () => toggle(t.id) : undefined}
                  className={`group flex items-center gap-3 px-4 py-3 transition-colors ${
                    insertMode ? "cursor-pointer" : ""
                  } ${isSel ? "bg-surface-raised" : "hover:bg-surface-raised/50"}`}
                >
                  {insertMode && (
                    <div
                      className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isSel
                          ? "bg-warning border-warning"
                          : "border-border-strong"
                      }`}
                    >
                      {isSel && (
                        <Check
                          size={9}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  )}
                  <TemplateThumb
                    template={{
                      ...t,
                      imageUrl: templateById.get(t.id)?.imageUrl ?? null,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.name}
                    </p>
                    {t.description && t.description !== t.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 tabular-nums mt-0.5">
                      {formatPrice(t.defaultUnitPriceCents, currency)} ×{" "}
                      {formatQty(t.defaultQty)}
                    </p>
                  </div>
                  {!insertMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMember(group.id, t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {insertMode ? (
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-subtle p-3">
          {selected.size > 0 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                {t("templateLibrary.clear")}
              </Button>
              <Button
                type="button"
                variant="solid"
                size="sm"
                onClick={() => onInsertSelected?.([...selected])}
              >
                {t("templateLibrary.insertItems", {
                  count: selected.size,
                  plural: selected.size !== 1 ? "s" : "",
                })}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={onInsertAll}
              disabled={group.templates.length === 0}
            >
              {t("templateLibrary.insertAll")}{" "}
              {group.templates.length > 0 ? `(${group.templates.length})` : ""}
            </Button>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border-subtle flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            {t("templateLibrary.itemCountUseInWizard", {
              count: group.templates.length,
              plural: group.templates.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
