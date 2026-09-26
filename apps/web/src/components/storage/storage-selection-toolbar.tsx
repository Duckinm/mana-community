// Top toolbar shown in place of search/sort/tag-filter row while files are selected.
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  FolderInput,
  Loader2,
  Tag,
  Trash2,
  X,
} from "@/components/icons";
import { useTranslation } from "react-i18next";

interface Props {
  selectedCount: number;
  onDownload: () => void;
  downloading: boolean;
  allSelected?: boolean;
  onMove: () => void;
  moving: boolean;
  onDelete: () => void;
  deleting: boolean;
  onClear: () => void;
  tagOptions: { tag: string; onAllSelected: boolean }[];
  onToggleTag: (tag: string, onAllSelected: boolean) => void;
  newTagInput: string;
  onNewTagInputChange: (value: string) => void;
  onAddTag: (raw: string) => void;
  tagSaving: boolean;
}

export function StorageSelectionToolbar({
  selectedCount,
  onDownload,
  downloading,
  allSelected,
  onMove,
  moving,
  onDelete,
  deleting,
  onClear,
  tagOptions,
  onToggleTag,
  newTagInput,
  onNewTagInputChange,
  onAddTag,
  tagSaving,
}: Props) {
  const { t } = useTranslation("storage");
  const busy = downloading || moving || deleting;

  return (
    <div className="flex h-9 items-center gap-1 rounded-lg border border-border-default bg-card px-3">
      <span className="shrink-0 text-xs font-semibold text-foreground">
        {t("selectedCount", { count: selectedCount })}
      </span>
      <div className="mx-2 h-4 w-px shrink-0 bg-border-subtle" />

      <button
        type="button"
        onClick={onDownload}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-base hover:bg-surface-raised disabled:opacity-50"
      >
        {downloading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} strokeWidth={2} />
        )}
        {allSelected ? t("downloadAllAsZip") : t("download")}
      </button>

      <button
        type="button"
        onClick={onMove}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-base hover:bg-surface-raised disabled:opacity-50"
      >
        {moving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <FolderInput size={12} strokeWidth={2} />
        )}
        {t("move")}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground transition-all duration-base hover:bg-surface-raised disabled:opacity-50"
          >
            <Tag size={12} strokeWidth={2} />
            {t("tagAction")}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tagOptions.map(({ tag, onAllSelected }) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag, onAllSelected)}
                disabled={tagSaving}
                title={
                  onAllSelected
                    ? t("removeTagFromSelected")
                    : t("addTagToSelected")
                }
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-base active:scale-95 disabled:opacity-50"
                style={{
                  background: onAllSelected
                    ? "var(--category-purple-soft)"
                    : "var(--border-subtle)",
                  color: onAllSelected
                    ? "var(--category-purple)"
                    : "var(--text-muted)",
                  border: `1px solid ${onAllSelected ? "var(--category-purple-soft)" : "var(--border-default)"}`,
                }}
              >
                {tag}
                {onAllSelected && <X size={10} strokeWidth={2.5} />}
              </button>
            ))}
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => onNewTagInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  onAddTag(newTagInput);
                }
              }}
              onBlur={() => {
                if (newTagInput.trim()) onAddTag(newTagInput);
              }}
              placeholder={t("addTag")}
              disabled={tagSaving}
              autoFocus
              className="min-w-20 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50"
            />
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition-all duration-base hover:bg-danger-soft disabled:opacity-50"
      >
        {deleting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} strokeWidth={2} />
        )}
        {t("delete")}
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onClear}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-base hover:bg-surface-raised hover:text-foreground"
      >
        <X size={12} strokeWidth={2} />
        {t("clear")}
      </button>
    </div>
  );
}
