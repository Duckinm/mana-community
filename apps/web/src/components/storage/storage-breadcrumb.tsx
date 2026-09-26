// Ancestor trail + live folder/file/size summary for the folder-page header.
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useStorage } from "@/context/storage";
import { formatBinaryBytes } from "@/lib/format-bytes";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";

interface Props {
  folderId: string;
  onSelectFolder: (folderId: string) => void;
}

export function StorageBreadcrumb({ folderId, onSelectFolder }: Props) {
  const { t } = useTranslation("storage");
  const { loading, getBreadcrumb, getChildFolders, getFilesInFolder } =
    useStorage();

  if (loading) {
    return <Skeleton className="h-5 w-48 rounded-md" />;
  }

  const trail = getBreadcrumb(folderId);
  const childFolders = getChildFolders(folderId);
  const files = getFilesInFolder(folderId);
  const hasContent = childFolders.length > 0 || files.length > 0;
  const totalBytes = files.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
  const current = trail[trail.length - 1];
  const parent = trail.length > 1 ? trail[trail.length - 2] : null;

  const summary = hasContent
    ? [
        childFolders.length > 0 &&
          t("folderCount", { count: childFolders.length }),
        files.length > 0 && t("fileCount", { count: files.length }),
        files.length > 0 && formatBinaryBytes(totalBytes),
      ]
        .filter(Boolean)
        .join(" · ")
    : t("emptyFolder");

  return (
    <div className="min-w-0">
      <div className="hidden items-baseline gap-x-3 gap-y-1 sm:flex sm:flex-wrap">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          <Link
            to="/storage"
            search={{ sort: "name-asc" }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("pageTitle")}
          </Link>
          {trail.map((folder, i) => {
            const isLast = i === trail.length - 1;
            return (
              <span key={folder.id} className="flex items-center gap-1.5">
                <ChevronRight
                  size={12}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground"
                />
                {isLast ? (
                  <span className="font-semibold text-foreground">
                    {folder.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectFolder(folder.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {folder.name}
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="sm:hidden">
        <div className="flex min-w-0 items-center gap-1">
          {parent ? (
            <button
              type="button"
              onClick={() => onSelectFolder(parent.id)}
              aria-label={parent.name}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          ) : (
            <Link
              to="/storage"
              search={{ sort: "name-asc" }}
              aria-label={t("pageTitle")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </Link>
          )}
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
            {current?.name ?? t("pageTitle")}
          </h2>
        </div>
        <p className="mt-1 pl-8 text-xs text-muted-foreground">{summary}</p>
      </div>
    </div>
  );
}
