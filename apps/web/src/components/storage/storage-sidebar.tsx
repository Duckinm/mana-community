import { Clock, Folder, FolderOpen, Star, Trash2 } from "@/components/icons";
import { StorageGlobalSearch } from "@/components/storage/storage-global-search";
import type { PinnedView } from "@/components/storage/storage-pinned-view";
import { StorageQuotaBar } from "@/components/storage/storage-quota-bar";
import { sortStorageFolders } from "@/components/storage/storage-sort";
import type { StorageFolder } from "@/components/storage/types";
import { Badge } from "@/components/ui/badge";
import { useFolderTree } from "@/context/storage";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

function PinnedRow({
  icon: RowIcon,
  label,
  isActive,
  onClick,
}: {
  icon: typeof Star;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-base",
        isActive ? "bg-surface-raised" : "hover:bg-surface-raised",
      )}
    >
      <RowIcon
        size={14}
        strokeWidth={1.5}
        className={cn(
          "shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-sm truncate flex-1",
          isActive ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

interface Props {
  activeFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  trashedCount?: number;
  onOpenTrash?: () => void;
  pinnedView: PinnedView | null;
  onSelectPinned: (view: PinnedView) => void;
  /** Full-height panel column (desktop) instead of a floating card. */
  flush?: boolean;
  className?: string;
}

function FolderRow({
  folder,
  isActive,
  fileCount,
  onClick,
}: {
  folder: StorageFolder;
  isActive: boolean;
  fileCount: number;
  onClick: () => void;
}) {
  const Icon = isActive ? FolderOpen : Folder;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-base group",
        isActive ? "bg-surface-raised" : "bg-transparent hover:bg-surface-raised",
      )}
    >
      <Icon
        size={14}
        strokeWidth={1.5}
        className={cn(
          "shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-sm truncate flex-1",
          isActive ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {folder.name}
      </span>
      {fileCount > 0 && (
        <span className="text-2xs text-muted-foreground tabular-nums shrink-0">
          {fileCount}
        </span>
      )}
    </button>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1.5 pt-4 first:pt-1">
      <span className="text-2xs font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function StorageSidebar({
  activeFolderId,
  onSelectFolder,
  trashedCount = 0,
  onOpenTrash,
  pinnedView,
  onSelectPinned,
  flush = false,
  className,
}: Props) {
  const { t } = useTranslation("storage");
  const { getRootFolders, getFilesInFolder } = useFolderTree();
  const roots = getRootFolders();

  const contactFolders = sortStorageFolders(
    roots.filter((f) => f.entityType === "contact"),
    "name-asc",
  );
  const projectFolders = sortStorageFolders(
    roots.filter((f) => f.entityType === "project"),
    "name-asc",
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex w-full shrink-0 flex-col overflow-visible",
        flush
          ? "h-full w-72"
          : "surface-card max-h-[35dvh] rounded-2xl lg:h-full lg:max-h-none lg:w-60",
        className,
      )}
    >
      <div className="relative z-20 shrink-0 border-b border-border-subtle p-3">
        <StorageGlobalSearch />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain p-2 pb-2">
        <SectionHeader label={t("pinned")} />
        <PinnedRow
          icon={Clock}
          label={t("recent")}
          isActive={pinnedView === "recent"}
          onClick={() => onSelectPinned("recent")}
        />
        <PinnedRow
          icon={Star}
          label={t("starred")}
          isActive={pinnedView === "starred"}
          onClick={() => onSelectPinned("starred")}
        />

        {projectFolders.length > 0 && (
          <>
            <SectionHeader label={t("projects")} />
            {projectFolders.map((f) => (
              <FolderRow
                key={f.id}
                folder={f}
                isActive={!pinnedView && activeFolderId === f.id}
                fileCount={getFilesInFolder(f.id).length}
                onClick={() => onSelectFolder(f.id)}
              />
            ))}
          </>
        )}

        {contactFolders.length > 0 && (
          <>
            <SectionHeader label={t("contacts")} />
            {contactFolders.map((f) => (
              <FolderRow
                key={f.id}
                folder={f}
                isActive={!pinnedView && activeFolderId === f.id}
                fileCount={getFilesInFolder(f.id).length}
                onClick={() => onSelectFolder(f.id)}
              />
            ))}
          </>
        )}

        {onOpenTrash && (
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={onOpenTrash}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all duration-base hover:bg-surface-raised"
            >
              <Trash2
                size={14}
                strokeWidth={1.5}
                className="shrink-0 text-destructive"
              />
              <span className="flex-1 text-sm text-muted-foreground">
                {t("trash")}
              </span>
              {trashedCount > 0 && (
                <Badge variant="danger" size="sm">
                  {trashedCount}
                </Badge>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-b-2xl border-t border-border-subtle px-3 py-2.5">
        <StorageQuotaBar compact />
      </div>
    </motion.aside>
  );
}
