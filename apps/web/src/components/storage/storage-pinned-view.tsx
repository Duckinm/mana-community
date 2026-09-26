import { Clock, Star, X } from "@/components/icons";
import { FileIcon } from "@/components/storage/file-icon";
import { FilePreviewModal } from "@/components/storage/file-preview-modal";
import type { StorageFile } from "@/components/storage/types";
import { formatUploadedAt } from "@/components/storage/uploaded-at";
import { useFolderTree } from "@/context/storage";
import { useStarredFiles } from "@/hooks/use-starred-files";
import { formatBinaryBytes } from "@/lib/format-bytes";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const RECENT_FILES_LIMIT = 10;

export type PinnedView = "recent" | "starred";

interface Props {
  view: PinnedView;
  onClose: () => void;
}

export function StoragePinnedView({ view, onClose }: Props) {
  const { t } = useTranslation("storage");
  const { files } = useFolderTree();
  const { isStarred, toggleStar, starredIds } = useStarredFiles();
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);

  const listed = useMemo(() => {
    if (view === "starred") return files.filter((f) => starredIds.has(f.id));
    return [...files]
      .sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.uploadedAt).getTime() -
          new Date(a.updatedAt ?? a.uploadedAt).getTime(),
      )
      .slice(0, RECENT_FILES_LIMIT);
  }, [files, starredIds, view]);

  const ViewIcon = view === "recent" ? Clock : Star;

  return (
    <>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 sm:mb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
              <ViewIcon size={13} strokeWidth={1.5} className="text-primary" />
            </div>
            <p className="truncate text-sm font-semibold text-foreground">
              {t(view)}
            </p>
            <span className="text-2xs tabular-nums text-muted-foreground">
              {t("fileCount", { count: listed.length })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common:goBack")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface-card text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {listed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16">
              <ViewIcon
                size={20}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                {view === "recent" ? t("noRecentFiles") : t("noStarredFiles")}
              </p>
            </div>
          ) : (
            <div className="list-shell mb-4">
              {listed.map((file) => {
                const starred = isStarred(file.id);
                return (
                  <div
                    key={file.id}
                    className="group flex items-center gap-3 border-b border-border-subtle px-3 py-2.5 transition-colors duration-base last:border-b-0 hover:bg-surface-raised"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <FileIcon kind={file.kind} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {file.name}
                      </span>
                      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                        {formatBinaryBytes(file.sizeBytes)}
                      </span>
                      <span className="hidden w-40 shrink-0 truncate text-right text-xs text-muted-foreground md:inline">
                        {formatUploadedAt(file.updatedAt ?? file.uploadedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStar(file.id)}
                      aria-label={t("starred")}
                      aria-pressed={starred}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-fast hover:bg-surface-overlay sm:size-7"
                    >
                      <Star
                        size={13}
                        strokeWidth={1.5}
                        weight={starred ? "fill" : "regular"}
                        className={
                          starred ? "text-warning" : "text-muted-foreground"
                        }
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
