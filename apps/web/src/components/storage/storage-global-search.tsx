import { FileIcon } from "@/components/storage/file-icon";
import { StorageSearchResultsSkeleton } from "@/components/storage/storage-search-results-skeleton";
import type { StorageFile } from "@/components/storage/types";
import { formatUploadedAt } from "@/components/storage/uploaded-at";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { SearchBar } from "@/components/ui/search-bar";
import { client, expectEden } from "@/lib/eden";
import { formatBinaryBytes } from "@/lib/format-bytes";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageGlobalSearch() {
  const { t } = useTranslation("storage");
  const [globalSearch, setGlobalSearch] = useState("");
  const navigate = useNavigate();

  const { data: searchResults, isFetching } = useQuery<StorageFile[]>({
    queryKey: ["storage", "search", globalSearch],
    queryFn: async () =>
      expectEden(
        await client.api.storage.files.get({ query: { q: globalSearch } }),
      ),
    enabled: globalSearch.trim().length > 0,
  });

  const open = globalSearch.trim().length > 0;

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <SearchBar
          value={globalSearch}
          onChange={setGlobalSearch}
          placeholder={t("searchAllFiles")}
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[calc(var(--radix-popover-trigger-width)*1.5)] max-w-[calc(100vw-3rem)] p-0"
      >
        {isFetching && open ? (
          <StorageSearchResultsSkeleton />
        ) : searchResults && searchResults.length > 0 ? (
          <div className="max-h-72 overflow-y-auto">
            {searchResults.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => {
                  if (file.folderId) {
                    navigate({
                      to: "/storage/$folderId",
                      params: { folderId: file.folderId },
                      search: { q: "", sort: "name-asc", kind: "all" },
                    });
                  }
                  setGlobalSearch("");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-border-subtle transition-colors text-left"
              >
                <FileIcon kind={file.kind} size={12} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBinaryBytes(file.sizeBytes)} ·{" "}
                    {formatUploadedAt(file.uploadedAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("noFilesFoundFor", { query: globalSearch })}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
