import { FileIcon } from "@/components/storage/file-icon";
import type { StorageFile } from "@/components/storage/types";
import { RotateCcw, Trash2, X } from "@/components/icons";
import { Sheet, SheetDragRegion } from "@/components/ui/sheet";
import { formatBinaryBytes } from "@/lib/format-bytes";
import {
  formatStorageTrashDeletedDate,
  STORAGE_TRASH_RETENTION_DAYS,
  storageTrashDaysRemaining,
} from "@/lib/storage-trash";

interface Props {
  open: boolean;
  trashedFiles: StorageFile[];
  onRestore: (id: string) => Promise<void>;
  onClose: () => void;
  restoringId?: string | null;
}

export function StorageTrashPanel({
  open,
  trashedFiles,
  onRestore,
  onClose,
  restoringId = null,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      side="right"
      className="w-[min(380px,100vw)] border-border-strong bg-surface-overlay"
    >
      <SheetDragRegion className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2 size={13} strokeWidth={1.5} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Trash</p>
            <p className="text-2xs text-muted-foreground">
              Permanently deleted after {STORAGE_TRASH_RETENTION_DAYS} days
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised sm:h-7 sm:w-7"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </SheetDragRegion>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {trashedFiles.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 opacity-30">
            <Trash2 size={24} strokeWidth={1} className="text-foreground" />
            <p className="text-sm text-foreground">Trash is empty</p>
          </div>
        ) : (
          trashedFiles.map((file) => {
            const days = file.deletedAt
              ? storageTrashDaysRemaining(file.deletedAt)
              : STORAGE_TRASH_RETENTION_DAYS;
            const urgent = days <= 3;
            const restoring = restoringId === file.id;

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl px-3 py-3"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <FileIcon kind={file.kind} size={14} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-2xs text-muted-foreground">
                      {formatBinaryBytes(file.sizeBytes)}
                    </span>
                    {file.deletedAt && (
                      <span className="text-2xs text-muted-foreground">
                        Deleted {formatStorageTrashDeletedDate(file.deletedAt)}
                      </span>
                    )}
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-2xs font-semibold ${
                        urgent
                          ? "bg-destructive/10 text-destructive"
                          : "bg-border-subtle text-muted-foreground"
                      }`}
                    >
                      {days}d left
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onRestore(file.id)}
                  disabled={restoring}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-border bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary transition-all hover:opacity-90 disabled:opacity-50"
                >
                  <RotateCcw
                    size={11}
                    strokeWidth={2}
                    className={restoring ? "animate-spin" : undefined}
                  />
                  Restore
                </button>
              </div>
            );
          })
        )}
      </div>
    </Sheet>
  );
}
