import { TemplateThumb } from "@/components/documents/library/template-gallery-card";
import {
  formatPrice,
  formatQty,
} from "@/components/documents/library/template-helpers";
import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TemplateRowProps {
  template: ItemTemplate;
  currency: string;
  insertMode?: boolean;
  pickMode?: boolean;
  isSelected?: boolean;
  isEditing?: boolean;
  showCheckbox?: boolean;
  /** When omitted, the row itself is not clickable (actions live in the menus). */
  onClick?: () => void;
  onToggleSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMouseEnter?: () => void;
}

export function TemplateRow({
  template,
  currency,
  insertMode = false,
  pickMode = false,
  isSelected = false,
  isEditing = false,
  showCheckbox = false,
  onClick,
  onToggleSelect,
  onEdit,
  onDelete,
  onMouseEnter,
}: TemplateRowProps) {
  const { t } = useTranslation("documents");
  const displayCurrency = template.currency || currency;
  const showDescription =
    template.description && template.description !== template.name;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "group flex min-h-[54px] w-full items-center gap-4 px-4 py-2 text-left transition-colors duration-fast",
        onClick ? "cursor-pointer" : "cursor-default",
        isSelected
          ? "bg-warning/5"
          : isEditing
            ? "bg-surface-raised"
            : "bg-surface-card hover:bg-surface-raised",
      )}
    >
      {insertMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
            isSelected
              ? "border-warning bg-warning opacity-100"
              : showCheckbox
                ? "border-border-strong opacity-100"
                : "border-border-strong opacity-0 group-hover:opacity-100",
          )}
          tabIndex={-1}
        >
          {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
        </button>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <TemplateThumb template={template} className="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {template.name}
          </p>
          {showDescription && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
          {formatQty(template.defaultQty)}
        </span>
        <span className="min-w-20 text-right text-xs font-medium tabular-nums text-muted-foreground">
          {formatPrice(template.defaultUnitPriceCents, displayCurrency)}
        </span>
        {pickMode ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-colors group-hover:bg-surface-overlay group-hover:text-foreground group-hover:opacity-100">
            <Plus size={16} strokeWidth={2.5} />
          </span>
        ) : onEdit && !insertMode ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors group-hover:bg-surface-overlay group-hover:text-foreground xl:flex",
                  isEditing
                    ? "opacity-100"
                    : "opacity-70 group-hover:opacity-100",
                )}
              >
                <MoreHorizontal size={16} />
              </span>
            </DropdownMenuTrigger>
            {/* row root is a button; portal events bubble through the React tree, so stop them here */}
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={onEdit}>
                <Pencil size={14} strokeWidth={1.75} />
                {t("templateLibrary.edit")}
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                  {t("templateLibrary.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </button>
  );
}
