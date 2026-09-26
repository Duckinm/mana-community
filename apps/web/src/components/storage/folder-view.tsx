import { resolveApiBaseUrl } from "@/lib/api-base-url";
// FolderView — browse sub-folders + files with search, sort, kind filter, bulk select, and tags.
import { StorageTrashConfirmDialog } from "@/components/storage/storage-trash-confirm-dialog";
import { BulkMoveDialog } from "@/components/storage/bulk-move-dialog";
import { FilePreviewModal } from "@/components/storage/file-preview-modal";
import { StorageBreadcrumb } from "@/components/storage/storage-breadcrumb";
import { StorageFileRow } from "@/components/storage/storage-file-row";
import { StorageSelectionToolbar } from "@/components/storage/storage-selection-toolbar";
import type { FileKind, StorageFile } from "@/components/storage/types";
import type { UploadDropzoneHandle } from "@/components/storage/upload-dropzone";
import { UploadDropzone } from "@/components/storage/upload-dropzone";
import {
  sortStorageFiles,
  sortStorageFolders,
  type FolderSortKey,
} from "@/components/storage/storage-sort";
import { StorageSortSelect } from "@/components/storage/storage-sort-select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useStorage } from "@/context/storage";
import { useStarredFiles } from "@/hooks/use-starred-files";
import { useStorageFileTrashActions } from "@/hooks/use-storage-file-trash-actions";
import { useStorageUploadGuard } from "@/hooks/use-storage-upload-guard";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { triggerDownloadFromUrl } from "@/lib/trigger-download";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Folder,
  FolderInput,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "@/components/icons";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export type { FolderSortKey } from "@/components/storage/storage-sort";

const BASE_URL = resolveApiBaseUrl();

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

const newFolderSchema = z.object({
  name: z.string().trim().min(1),
});

interface Props {
  folderId: string | null;
  query: string;
  sort: FolderSortKey;
  kindFilter: FileKind | "all";
  tagFilter: string | null;
  onEnterFolder: (folderId: string) => void;
  onSearch: (q: string) => void;
  onSort: (s: FolderSortKey) => void;
  onKindFilter: (k: FileKind | "all") => void;
  onTagFilter: (tag: string | null) => void;
  folderName?: string;
}

export function FolderView({
  folderId,
  query,
  sort,
  kindFilter,
  tagFilter,
  onEnterFolder,
  onSearch,
  onSort,
  onKindFilter: _onKindFilter,
  onTagFilter,
  folderName,
}: Props) {
  const { t } = useTranslation("storage");
  const { getChildFolders, getFilesInFolder, getDownloadUrl, createSubFolder } =
    useStorage();
  const {
    pendingIds,
    trashing,
    requestTrash,
    cancelTrash,
    confirmTrash,
    primaryFileName,
  } = useStorageFileTrashActions();
  const { isFull, guardUpload } = useStorageUploadGuard();
  const { isStarred, toggleStar } = useStarredFiles();
  const queryClient = useQueryClient();
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const uploadRef = useRef<UploadDropzoneHandle>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [downloadingFolder, setDownloadingFolder] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const newFolderForm = useForm({
    defaultValues: { name: "" },
    validators: { onChange: newFolderSchema },
    onSubmit: async ({ value }) => {
      if (!folderId) return;
      const folder = await createSubFolder(folderId, value.name.trim());
      setNewFolderMode(false);
      onEnterFolder(folder.id);
    },
  });
  const [newTagInput, setNewTagInput] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const showSelectionUi = selectionMode && selectedIds.size > 0;

  const rawFolders = folderId ? getChildFolders(folderId) : [];
  const rawFiles = folderId ? getFilesInFolder(folderId) : [];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    rawFiles.forEach((f) => f.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [rawFiles]);

  const filteredFolders = useMemo(() => {
    let result = rawFolders;
    if (query.trim()) {
      result = result.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase()),
      );
    }
    return sortStorageFolders(result, sort);
  }, [rawFolders, query, sort]);

  const filteredFiles = useMemo(() => {
    let result = rawFiles;
    if (query.trim())
      result = result.filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase()),
      );
    if (kindFilter !== "all")
      result = result.filter((f) => f.kind === kindFilter);
    if (tagFilter) result = result.filter((f) => f.tags?.includes(tagFilter));
    return sortStorageFiles(result, sort);
  }, [rawFiles, query, kindFilter, tagFilter, sort]);

  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;
  const hasContent = rawFolders.length > 0 || rawFiles.length > 0;
  const allFilesSelected =
    filteredFiles.length > 0 && selectedIds.size === filteredFiles.length;

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function enterSelectionMode(fileId: string) {
    setSelectionMode(true);
    setSelectedIds(new Set([fileId]));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredFiles.length) {
      exitSelectionMode();
    } else {
      setSelectionMode(true);
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  }

  function handleFileRowClick(fileId: string) {
    if (renamingId === fileId) return;
    const file = filteredFiles.find((f) => f.id === fileId);
    if (file) setPreviewFile(file);
  }

  function handleCheckboxClick(e: React.MouseEvent, fileId: string) {
    e.stopPropagation();
    if (!selectionMode) {
      enterSelectionMode(fileId);
    } else {
      toggleSelect(fileId);
    }
  }

  async function applyTagToFiles(tag: string, fileIds: string[]) {
    if (fileIds.length === 0) return;
    setTagSaving(true);
    try {
      await Promise.all(
        fileIds.map(async (id) => {
          const file = rawFiles.find((f) => f.id === id);
          if (!file || file.tags.includes(tag)) return;
          const result = await client.api.storage
            .files({ id })
            .tags.patch({ tags: [...file.tags, tag] });
          if (result.error) throw new Error("Failed to update tags");
        }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
    } catch {
      toast.error(t("failedToAddTag"));
    } finally {
      setTagSaving(false);
    }
  }

  async function addFolderTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    setNewTagInput("");
    if (selectedIds.size > 0) {
      await applyTagToFiles(tag, Array.from(selectedIds));
    }
  }

  async function patchRemoveTag(files: StorageFile[], tag: string) {
    await Promise.all(
      files.map(async (file) => {
        const result = await client.api.storage
          .files({ id: file.id })
          .tags.patch({ tags: file.tags.filter((t) => t !== tag) });
        if (result.error) throw new Error("Failed to update tags");
      }),
    );
    await queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
  }

  async function removeTagEverywhere(tag: string) {
    const carriers = rawFiles.filter((f) => f.tags?.includes(tag));
    if (carriers.length === 0) return;
    setTagSaving(true);
    try {
      await patchRemoveTag(carriers, tag);
      if (tagFilter === tag) onTagFilter(null);
      toast.success(t("tagRemoved", { tag, count: carriers.length }));
    } catch {
      toast.error(t("failedToRemoveTag"));
    } finally {
      setTagSaving(false);
    }
  }

  function toggleTagOnSelection(tag: string, onAllSelected: boolean) {
    const ids = Array.from(selectedIds);
    if (!onAllSelected) {
      void applyTagToFiles(tag, ids);
      return;
    }
    const carriers = rawFiles.filter(
      (f) => selectedIds.has(f.id) && f.tags?.includes(tag),
    );
    setTagSaving(true);
    void patchRemoveTag(carriers, tag)
      .catch(() => toast.error(t("failedToRemoveTag")))
      .finally(() => setTagSaving(false));
  }

  async function handleBulkMove(targetFolderId: string | null) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkMoving(true);
    try {
      const result = await client.api.storage.files["bulk-move"].patch({
        fileIds: ids,
        folderId: targetFolderId,
      });
      if (result.error) throw new Error("Bulk move failed");
      await queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
      exitSelectionMode();
      toast.success(t("movedFiles", { count: ids.length }));
    } catch {
      toast.error(t("failedToMoveFiles"));
    } finally {
      setBulkMoving(false);
    }
  }

  async function handleTrashConfirmed() {
    await confirmTrash((fileIds) => {
      if (fileIds.some((id) => selectedIds.has(id))) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          fileIds.forEach((id) => next.delete(id));
          if (next.size === 0) setSelectionMode(false);
          return next;
        });
      }
      if (previewFile && fileIds.includes(previewFile.id)) {
        setPreviewFile(null);
      }
    });
  }

  function requestTrashFiles(fileIds: string[]) {
    requestTrash(fileIds);
  }

  function handleUploaded(names: string[]) {
    const label =
      names.length === 1
        ? names[0]
        : t("uploadedFilesCount", { count: names.length });
    setUploadToast(label);
    setTimeout(() => setUploadToast(null), 3000);
  }

  async function submitRename(
    type: "file" | "folder",
    id: string,
    currentName: string,
  ) {
    const newName = renameValue.trim();
    if (!newName || newName === currentName) {
      setRenamingId(null);
      return;
    }
    try {
      if (type === "file") {
        await client.api.storage.files({ id }).patch({ name: newName });
      } else {
        await client.api.storage.folders({ id }).patch({ name: newName });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
      queryClient.invalidateQueries({ queryKey: queryKeys.storageFolders });
      toast.success(t("renamed"));
    } catch {
      toast.error(t("failedToRename"));
    } finally {
      setRenamingId(null);
    }
  }

  async function downloadFolder() {
    if (!folderId) return;
    setDownloadingFolder(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/storage/folders/${folderId}/download`,
        { credentials: "include" },
      );
      if (!res.ok) {
        toast.error(t("failedToDownloadFolder"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownloadFromUrl(url, `${folderName ?? "folder"}.zip`);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("failedToDownloadFolder"));
    } finally {
      setDownloadingFolder(false);
    }
  }

  async function handleFileDownload(file: StorageFile) {
    try {
      const url = await getDownloadUrl(file.id);
      triggerDownloadFromUrl(url, file.name);
    } catch {
      toast.error(t("failedToDownloadFile"));
    }
  }

  async function handleBulkDownload() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDownloading(true);
    try {
      for (const id of ids) {
        const file = rawFiles.find((f) => f.id === id);
        if (!file) continue;
        const url = await getDownloadUrl(file.id);
        triggerDownloadFromUrl(url, file.name);
      }
    } catch {
      toast.error(t("failedToDownloadFile"));
    } finally {
      setBulkDownloading(false);
    }
  }

  if (!folderId) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-[min(520px,58vh)] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/15 px-8 py-12 text-center shadow-[inset_0_1px_0_0_var(--border-subtle)]">
          <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-muted-foreground">
            <Folder size={18} />
          </div>
          <div className="max-w-md">
            <p className="text-sm font-medium text-foreground">
              {t("selectAFolder")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("selectAFolderDescription")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <BulkMoveDialog
        open={bulkMoveOpen}
        fileCount={selectedIds.size}
        onClose={() => setBulkMoveOpen(false)}
        onConfirm={handleBulkMove}
      />

      <StorageTrashConfirmDialog
        open={pendingIds !== null}
        onOpenChange={(open) => {
          if (!open) cancelTrash();
        }}
        fileCount={pendingIds?.length ?? 0}
        primaryFileName={primaryFileName(rawFiles)}
        onConfirm={() => void handleTrashConfirmed()}
        loading={trashing}
      />

      <DeleteConfirmDialog
        open={tagToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTagToDelete(null);
        }}
        title={t("removeTagTitle", { tag: tagToDelete ?? "" })}
        description={t("removeTagDescription", {
          count: rawFiles.filter((f) => f.tags?.includes(tagToDelete ?? ""))
            .length,
        })}
        confirmLabel={t("removeTagConfirm")}
        onConfirm={() => {
          if (tagToDelete) void removeTagEverywhere(tagToDelete);
        }}
      />

      <motion.div
        key={folderId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3 sm:mb-2.5 sm:items-center">
          <div className="min-w-0 flex-1">
            <StorageBreadcrumb
              folderId={folderId}
              onSelectFolder={onEnterFolder}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                newFolderForm.reset();
                setNewFolderMode(true);
              }}
              aria-label={t("newFolder")}
              title={t("newFolder")}
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-card text-xs font-medium text-foreground transition-colors hover:bg-surface-raised sm:h-9 sm:w-auto sm:px-3"
            >
              <Plus size={14} strokeWidth={2.5} className="shrink-0" />
              <span className="hidden sm:inline">{t("newFolder")}</span>
            </button>
            <button
              type="button"
              onClick={() => guardUpload(() => uploadRef.current?.open())}
              disabled={isFull}
              aria-label={t("upload")}
              title={isFull ? t("quotaFullTitle") : t("upload")}
              className="inline-flex size-9 items-center justify-center gap-1.5 rounded-lg border border-border-default bg-surface-card text-xs font-medium text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-auto sm:px-3"
            >
              <Upload size={14} strokeWidth={2.5} className="shrink-0" />
              <span className="hidden sm:inline">{t("upload")}</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {uploadToast && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mb-3 overflow-hidden"
            >
              <div
                className="px-3 py-2 rounded-xl text-xs flex items-center gap-2"
                style={{
                  background: "var(--primary-soft)",
                  border: "1px solid var(--primary-border)",
                }}
              >
                <span className="text-primary">↑</span>
                <span className="text-foreground">
                  {t("uploadedLabel")}{" "}
                  <strong className="text-foreground">{uploadToast}</strong>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasContent && (
          <div className="mb-2.5 shrink-0 space-y-2">
            {showSelectionUi ? (
              <StorageSelectionToolbar
                selectedCount={selectedIds.size}
                onDownload={() =>
                  void (allFilesSelected
                    ? downloadFolder()
                    : handleBulkDownload())
                }
                downloading={
                  allFilesSelected ? downloadingFolder : bulkDownloading
                }
                allSelected={allFilesSelected}
                onMove={() => setBulkMoveOpen(true)}
                moving={bulkMoving}
                onDelete={() => requestTrashFiles(Array.from(selectedIds))}
                deleting={trashing}
                onClear={exitSelectionMode}
                tagOptions={allTags.map((tag) => ({
                  tag,
                  onAllSelected: filteredFiles
                    .filter((f) => selectedIds.has(f.id))
                    .every((f) => f.tags?.includes(tag)),
                }))}
                onToggleTag={toggleTagOnSelection}
                newTagInput={newTagInput}
                onNewTagInputChange={setNewTagInput}
                onAddTag={(raw) => void addFolderTag(raw)}
                tagSaving={tagSaving}
              />
            ) : (
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <SearchBar
                  value={query}
                  onChange={onSearch}
                  placeholder={t("searchFilesAndFolders")}
                  className="h-9 w-full md:min-w-0 md:flex-1"
                />

                <StorageSortSelect
                  value={sort}
                  onChange={onSort}
                  className="h-9 shrink-0"
                />
              </div>
            )}

            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {allTags.map((tag) => {
                  const isActive = tagFilter === tag;
                  return (
                    <span
                      key={tag}
                      className="group inline-flex items-center rounded-full text-2xs transition-all duration-base"
                      style={{
                        background: isActive
                          ? "var(--category-purple-soft)"
                          : "var(--border-subtle)",
                        color: isActive
                          ? "var(--category-purple)"
                          : "var(--text-muted)",
                        border: `1px solid ${isActive ? "var(--category-purple-soft)" : "var(--border-default)"}`,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onTagFilter(isActive ? null : tag)}
                        className="py-0.5 pl-2 pr-1 transition-transform duration-base active:scale-95"
                      >
                        {tag}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTagToDelete(tag)}
                        disabled={tagSaving}
                        aria-label={t("removeTagEverywhere", { tag })}
                        title={t("removeTagEverywhere", { tag })}
                        className="py-0.5 pr-1.5 transition-opacity duration-fast hover:text-danger focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <UploadDropzone
            ref={uploadRef}
            folderId={folderId}
            onUploaded={handleUploaded}
          >
            {filteredFolders.length > 0 && (
              <div className="mb-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                {filteredFolders.map((sf, i) => (
                  <motion.div
                    key={sf.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-base surface-card surface-card-hover"
                  >
                    {renamingId === sf.id ? (
                      <>
                        <Folder
                          size={16}
                          className="text-muted-foreground shrink-0"
                          strokeWidth={1.5}
                        />
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              void submitRename("folder", sf.id, sf.name);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() =>
                            void submitRename("folder", sf.id, sf.name)
                          }
                          className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </>
                    ) : (
                      <>
                        <button
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          onClick={() => onEnterFolder(sf.id)}
                        >
                          <Folder
                            size={16}
                            className="text-muted-foreground shrink-0"
                            strokeWidth={1.5}
                          />
                          <span className="text-sm truncate text-foreground">
                            {sf.name}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(sf.id);
                            setRenameValue(sf.name);
                          }}
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-surface-raised text-muted-foreground"
                          title={t("rename")}
                        >
                          <Pencil size={11} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {filteredFiles.length > 0 && (
              <div className="list-shell mb-4">
                <table className="w-full table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="w-10 px-3 py-2.5">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={allFilesSelected}
                          aria-label={t("selectAllColumn")}
                          onClick={toggleSelectAll}
                          className="flex size-4 items-center justify-center"
                        >
                          <span
                            className="flex size-3.5 items-center justify-center rounded border transition-all"
                            style={{
                              background: allFilesSelected
                                ? "var(--primary)"
                                : "transparent",
                              borderColor: allFilesSelected
                                ? "var(--primary)"
                                : "var(--border-default)",
                            }}
                          >
                            {allFilesSelected && (
                              <Check
                                size={9}
                                strokeWidth={3}
                                className="text-primary-foreground"
                              />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("columnName")}
                      </th>
                      <th className="hidden w-28 px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        {t("columnTags")}
                      </th>
                      <th className="hidden w-20 px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        {t("columnSize")}
                      </th>
                      <th className="hidden w-40 px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        {t("columnModified")}
                      </th>
                      <th className="w-12" aria-hidden />
                      <th className="hidden w-12 xl:table-cell" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <StorageFileRow
                        key={file.id}
                        file={file}
                        isSelected={selectedIds.has(file.id)}
                        isRenaming={renamingId === file.id}
                        renameValue={renameValue}
                        onRenameValueChange={setRenameValue}
                        onSubmitRename={() =>
                          void submitRename("file", file.id, file.name)
                        }
                        onCancelRename={() => setRenamingId(null)}
                        onStartRename={() => {
                          setRenamingId(file.id);
                          setRenameValue(file.name);
                        }}
                        onRowClick={() => handleFileRowClick(file.id)}
                        onCheckboxClick={(e) => handleCheckboxClick(e, file.id)}
                        onDownload={() => void handleFileDownload(file)}
                        onDelete={() => requestTrashFiles([file.id])}
                        deleting={trashing}
                        isStarred={isStarred(file.id)}
                        onToggleStar={() => toggleStar(file.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isEmpty && hasContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl flex flex-col items-center justify-center gap-2 py-12 border border-dashed border-border"
              >
                <Search
                  size={20}
                  className="text-muted-foreground"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">
                  {t("noResultsFor", { query: query || tagFilter })}
                </p>
                <button
                  onClick={() => {
                    onSearch("");
                    onTagFilter(null);
                  }}
                  className="text-xs font-medium transition-opacity hover:opacity-70 text-primary"
                >
                  {t("clearFilters")}
                </button>
              </motion.div>
            )}

            {!hasContent && (
              <button
                type="button"
                onClick={() => guardUpload(() => uploadRef.current?.open())}
                disabled={isFull}
                className="w-full flex flex-col items-center justify-center gap-3 py-20 text-center rounded-2xl border-2 border-dashed border-border bg-transparent hover:bg-surface-raised hover:border-border-strong transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-surface-raised text-muted-foreground">
                  <Upload size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("dropFilesHere")}
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {t("supportedFormats")}
                  </p>
                </div>
              </button>
            )}
          </UploadDropzone>
        </div>
      </motion.div>

      <Dialog
        open={newFolderMode}
        onOpenChange={(open) => !open && setNewFolderMode(false)}
      >
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b border-border-subtle px-5 pt-5 pb-3">
            <div className="w-9 h-9 rounded-xl bg-surface-raised flex items-center justify-center shrink-0">
              <FolderInput
                size={16}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
            </div>
            <DialogTitle className="font-semibold text-foreground">
              {t("newFolderModalTitle")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void newFolderForm.handleSubmit();
            }}
          >
            <div className="p-4">
              <newFolderForm.Field name="name">
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    Boolean(fieldError(field.state.meta.errors));
                  return (
                    <>
                      <Input
                        autoFocus
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setNewFolderMode(false);
                        }}
                        placeholder={t("folderNamePlaceholder")}
                        className={hasError ? "border-destructive" : undefined}
                      />
                      {hasError && (
                        <p className="mt-1 text-xs text-destructive">
                          {fieldError(field.state.meta.errors)}
                        </p>
                      )}
                    </>
                  );
                }}
              </newFolderForm.Field>
            </div>
            <div className="drawer-footer">
              <button
                type="button"
                onClick={() => setNewFolderMode(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised"
              >
                {t("cancel")}
              </button>
              <newFolderForm.Subscribe
                selector={(s) => s.values.name.trim().length === 0}
              >
                {(disabled) => (
                  <button
                    type="submit"
                    disabled={disabled}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  >
                    {t("create")}
                  </button>
                )}
              </newFolderForm.Subscribe>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
