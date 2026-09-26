// Single file table row — checkbox, name (icon + inline rename), tags, size, modified, row actions.
import { FileIcon } from "@/components/storage/file-icon";
import { FileTags } from "@/components/storage/file-tags";
import type { StorageFile } from "@/components/storage/types";
import { formatUploadedAt } from "@/components/storage/uploaded-at";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBinaryBytes } from "@/lib/format-bytes";
import {
  Check,
  Download,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "@/components/icons";
import { useTranslation } from "react-i18next";

interface Props {
  file: StorageFile;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onStartRename: () => void;
  onRowClick: () => void;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onDownload: () => void;
  onDelete: () => void;
  deleting: boolean;
  isStarred: boolean;
  onToggleStar: () => void;
}

export function StorageFileRow({
  file,
  isSelected,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onSubmitRename,
  onCancelRename,
  onStartRename,
  onRowClick,
  onCheckboxClick,
  onDownload,
  onDelete,
  deleting,
  isStarred,
  onToggleStar,
}: Props) {
  const { t } = useTranslation("storage");
  const modifiedAt = formatUploadedAt(file.updatedAt ?? file.uploadedAt);

  return (
    <tr
      onClick={onRowClick}
      className="group cursor-pointer border-b border-border-subtle transition-colors duration-base last:border-b-0 hover:bg-surface-raised"
      style={{ background: isSelected ? "var(--primary-soft)" : undefined }}
    >
      <td className="w-10 px-3 py-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          onClick={onCheckboxClick}
          className="flex size-4 items-center justify-center"
        >
          <span
            className="flex size-3.5 items-center justify-center rounded border transition-all"
            style={{
              background: isSelected ? "var(--primary)" : "transparent",
              borderColor: isSelected
                ? "var(--primary)"
                : "var(--border-default)",
            }}
          >
            {isSelected && (
              <Check
                size={9}
                strokeWidth={3}
                className="text-primary-foreground"
              />
            )}
          </span>
        </button>
      </td>

      <td className="min-w-0 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileIcon kind={file.kind} />
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => onRenameValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmitRename();
                if (e.key === "Escape") onCancelRename();
              }}
              onBlur={onSubmitRename}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
            />
          ) : (
            <p className="min-w-0 truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
          )}
        </div>
      </td>

      <td className="hidden px-3 py-2.5 md:table-cell">
        {file.tags?.length > 0 ? (
          <FileTags file={file} compact />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground md:table-cell">
        {formatBinaryBytes(file.sizeBytes)}
      </td>

      <td className="hidden w-40 px-3 py-2.5 text-right text-xs text-muted-foreground md:table-cell">
        <span className="block truncate" title={modifiedAt}>
          {modifiedAt}
        </span>
      </td>

      <td className="w-12 px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onToggleStar}
          aria-label={t("starred")}
          aria-pressed={isStarred}
          className={`mx-auto flex size-8 shrink-0 items-center justify-center rounded-lg transition-[color,background-color,opacity] duration-fast hover:bg-surface-overlay sm:size-7 ${isStarred ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
        >
          <Star
            size={13}
            strokeWidth={1.5}
            weight={isStarred ? "fill" : "regular"}
            className={isStarred ? "text-warning" : "text-muted-foreground"}
          />
        </button>
      </td>

      <td className="hidden w-12 py-2.5 pl-1 pr-3 xl:table-cell" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition-[color,background-color,opacity] duration-fast hover:bg-surface-overlay sm:size-7 sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label={t("fileActions")}
            >
              <MoreHorizontal size={14} strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onStartRename} className="gap-2">
              <Pencil size={14} />
              {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDownload} className="gap-2">
              <Download size={14} />
              {t("download")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              disabled={deleting}
              className="gap-2 text-danger focus:text-danger"
            >
              <Trash2 size={14} />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
