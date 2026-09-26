import type { FolderSortKey } from "@/components/storage/folder-view";
import { FolderView } from "@/components/storage/folder-view";
import { FolderViewSkeleton } from "@/components/storage/folder-view-skeleton";
import { StorageSidebar } from "@/components/storage/storage-sidebar";
import { StorageSidebarSkeleton } from "@/components/storage/storage-sidebar-skeleton";
import type { PinnedView } from "@/components/storage/storage-pinned-view";
import { StoragePinnedView } from "@/components/storage/storage-pinned-view";
import { StorageTrashPanel } from "@/components/storage/storage-trash-panel";
import type { FileKind } from "@/components/storage/types";
import { EntityNotFound } from "@/components/ui/entity-not-found";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { useStorage } from "@/context/storage";
import { useIsMobileNav } from "@/hooks/use-is-mobile-nav";
import { fadeIn, fadeUp, motionTransition, panelFadeUp } from "@/lib/motion";
import {
  getRouteApi,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
const storageFolderRoute = getRouteApi('/_app/storage/$folderId')

export function StorageFolderPage() {
  const { folderId } = storageFolderRoute.useParams();
  const { q, sort, kind, tag } = storageFolderRoute.useSearch();
  const routeNavigate = storageFolderRoute.useNavigate();
  const { loading, isError, refetch, getFolderById } = useStorage();
  const matches = useMatches();
  const isFileRoute = matches.some(
    (m) => m.routeId === "/_app/storage/$folderId/$fileId",
  );

  const folderName = getFolderById(folderId)?.name;

  if (isFileRoute) {
    return <Outlet />;
  }

  if (!loading && isError) {
    return (
      <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
        <div className="page-pad">
          <QueryErrorPanel onRetry={refetch} />
        </div>
      </div>
    );
  }

  if (!loading && !getFolderById(folderId)) {
    return (
      <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
        <div className="page-pad">
          <EntityNotFound backTo="/storage" />
        </div>
      </div>
    );
  }

  function handleSelectFolder(id: string) {
    routeNavigate({
      to: "/storage/$folderId",
      params: { folderId: id },
      search: (prev) => ({ ...prev, q: "", kind: "all", tag: undefined }),
      resetScroll: false,
    });
  }

  function handleSearch(query: string) {
    routeNavigate({
      search: (prev) => ({ ...prev, q: query }),
      replace: true,
      resetScroll: false,
    });
  }

  function handleSort(s: FolderSortKey) {
    routeNavigate({
      search: (prev) => ({ ...prev, sort: s }),
      replace: true,
      resetScroll: false,
    });
  }

  function handleKindFilter(k: FileKind | "all") {
    routeNavigate({
      search: (prev) => ({ ...prev, kind: k }),
      replace: true,
      resetScroll: false,
    });
  }

  function handleTagFilter(t: string | null) {
    routeNavigate({
      search: (prev) => ({ ...prev, tag: t ?? undefined }),
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <>
      <StorageContent
        folderId={folderId}
        folderName={folderName}
        isLoading={loading}
        isError={isError}
        onRetry={refetch}
        query={q}
        sort={sort}
        kindFilter={kind}
        tagFilter={tag ?? null}
        onSelectFolder={handleSelectFolder}
        onSearch={handleSearch}
        onSort={handleSort}
        onKindFilter={handleKindFilter}
        onTagFilter={handleTagFilter}
      />
    </>
  );
}

interface StorageContentProps {
  folderId: string | null;
  folderName?: string;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  query: string;
  sort: FolderSortKey;
  kindFilter: FileKind | "all";
  tagFilter: string | null;
  onSelectFolder: (id: string) => void;
  onSearch: (q: string) => void;
  onSort: (s: FolderSortKey) => void;
  onKindFilter: (k: FileKind | "all") => void;
  onTagFilter: (tag: string | null) => void;
}

export function StorageContent({
  folderId,
  folderName,
  isLoading,
  isError = false,
  onRetry,
  query,
  sort,
  kindFilter,
  tagFilter,
  onSelectFolder,
  onSearch,
  onSort,
  onKindFilter,
  onTagFilter,
}: StorageContentProps) {
  const { t } = useTranslation("storage");
  const isMobileNav = useIsMobileNav();
  const { trashedFiles, restoreFile } = useStorage();
  const [showTrash, setShowTrash] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pinnedView, setPinnedView] = useState<PinnedView | null>(null);

  async function handleRestoreFile(fileId: string) {
    setRestoringId(fileId);
    try {
      await restoreFile(fileId);
      toast.success(t("fileRestored"));
    } catch {
      toast.error(t("failedToRestoreFile"));
    } finally {
      setRestoringId(null);
    }
  }

  function handleSelectFolder(id: string) {
    onSelectFolder(id);
    setPinnedView(null);
  }

  const sidebarProps = {
    activeFolderId: folderId,
    onSelectFolder: handleSelectFolder,
    trashedCount: trashedFiles.length,
    onOpenTrash: () => {
      setShowTrash(true);
    },
    pinnedView,
    onSelectPinned: (view: PinnedView) => {
      setPinnedView(view);
    },
  };

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:order-last lg:block lg:h-full lg:shrink-0 lg:border-l lg:border-border-subtle">
          {isLoading ? (
            <StorageSidebarSkeleton />
          ) : (
            <StorageSidebar {...sidebarProps} flush />
          )}
        </div>
        <div className="page-scroll min-w-0 pb-6 pt-4 max-xl:pb-mobile-dock xl:pb-8 xl:pt-6">
          <div className="page-pad flex min-h-0 flex-1 flex-col">
            <motion.div
              {...fadeUp}
              className={
                folderId
                  ? "mb-3 hidden shrink-0 items-center justify-between gap-3 sm:flex"
                  : "mb-3 flex shrink-0 items-center justify-between gap-3"
              }
            >
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  {t("pageTitle")}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground max-xl:sr-only">
                  {t("pageSubtitle")}
                </p>
              </div>
            </motion.div>

            <motion.div
              {...panelFadeUp}
              transition={motionTransition(undefined, 0.05)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="storage-skeleton"
                    {...fadeIn}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <FolderViewSkeleton />
                  </motion.div>
                ) : isError ? (
                  <QueryErrorPanel onRetry={onRetry} />
                ) : (
                  <motion.div
                    key="storage-content"
                    {...fadeIn}
                    className="flex min-h-0 min-w-0 flex-1 flex-col"
                  >
                    <AnimatePresence mode="wait">
                      {pinnedView ? (
                        <StoragePinnedView
                          key={`pinned-${pinnedView}`}
                          view={pinnedView}
                          onClose={() => setPinnedView(null)}
                        />
                      ) : !folderId && isMobileNav ? (
                        // Below xl there's no desktop sidebar to pick a folder from —
                        // the index empty state becomes the picker itself, so it needs
                        // the full content height rather than the sidebar's usual 35dvh cap.
                        <StorageSidebar
                          key="mobile-tree"
                          {...sidebarProps}
                          className="max-h-none min-h-0 flex-1"
                        />
                      ) : (
                        <FolderView
                          key={folderId ?? "root"}
                          folderId={folderId}
                          folderName={folderName}
                          query={query}
                          sort={sort}
                          kindFilter={kindFilter}
                          tagFilter={tagFilter}
                          onEnterFolder={onSelectFolder}
                          onSearch={onSearch}
                          onSort={onSort}
                          onKindFilter={onKindFilter}
                          onTagFilter={onTagFilter}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      <StorageTrashPanel
        open={showTrash}
        trashedFiles={trashedFiles}
        onRestore={handleRestoreFile}
        onClose={() => setShowTrash(false)}
        restoringId={restoringId}
      />
    </>
  );
}
