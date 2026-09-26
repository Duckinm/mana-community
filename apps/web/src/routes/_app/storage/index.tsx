import type { EntityType } from "@/components/storage/types";
import { normalizeFolderSortKey, type FolderSortKey } from "@/components/storage/storage-sort";
import { useFolderTree } from "@/context/storage";
import { StorageContent } from "@/components/storage/storage-folder-page";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const noop = () => {};

const searchSchema = z.object({
  entityType: z.enum(["contact", "project", "transaction"]).optional(),
  entityId: z.string().optional(),
  sort: z
    .string()
    .catch("name-asc")
    .transform(normalizeFolderSortKey),
});

export const Route = createFileRoute("/_app/storage/")({
  validateSearch: searchSchema,
  component: StorageIndexPage,
});

function StorageIndexPage() {
  const { entityType, entityId, sort } = Route.useSearch();
  const navigate = useNavigate();
  const routeNavigate = Route.useNavigate();
  const { getEntityFolder, loading, isError, refetch } = useFolderTree();

  useEffect(() => {
    if (loading) return;
    if (entityType && entityId) {
      const folder = getEntityFolder(entityType as EntityType, entityId);
      if (folder) {
        navigate({
          to: "/storage/$folderId",
          params: { folderId: folder.id },
          search: { q: "", sort, kind: "all" },
          replace: true,
        });
      }
    }
  }, [loading, entityType, entityId, getEntityFolder, navigate, sort]);

  function handleSelectFolder(id: string) {
    navigate({
      to: "/storage/$folderId",
      params: { folderId: id },
      search: { q: "", sort, kind: "all" },
    });
  }

  function handleSort(next: FolderSortKey) {
    routeNavigate({
      search: (prev) => ({ ...prev, sort: next }),
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <StorageContent
      folderId={null}
      isLoading={loading}
      isError={isError}
      onRetry={refetch}
      query=""
      sort={sort}
      kindFilter="all"
      tagFilter={null}
      onSelectFolder={handleSelectFolder}
      onSearch={noop}
      onSort={handleSort}
      onKindFilter={noop}
      onTagFilter={noop}
    />
  );
}
