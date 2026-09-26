import type { StorageFile, StorageFolder } from "@/components/storage/types";
import { timestampToISO } from "@/lib/timestamp";
import type { TFunction } from "i18next";

export type FolderSortKey =
  | "name-asc"
  | "name-desc"
  | "added-desc"
  | "added-asc"
  | "modified-desc"
  | "modified-asc"
  | "size-desc"
  | "size-asc";

export function getSortOptionGroups(t: TFunction): {
  label: string;
  options: { value: FolderSortKey; label: string }[];
}[] {
  return [
    {
      label: t("sortGroupAlphabet"),
      options: [
        { value: "name-asc", label: t("sortAZ") },
        { value: "name-desc", label: t("sortZA") },
      ],
    },
    {
      label: t("sortGroupDateAdded"),
      options: [
        { value: "added-desc", label: t("sortNewestFirst") },
        { value: "added-asc", label: t("sortOldestFirst") },
      ],
    },
    {
      label: t("sortGroupDateModified"),
      options: [
        { value: "modified-desc", label: t("sortNewestFirst") },
        { value: "modified-asc", label: t("sortOldestFirst") },
      ],
    },
    {
      label: t("sortGroupSize"),
      options: [
        { value: "size-desc", label: t("sortLargestFirst") },
        { value: "size-asc", label: t("sortSmallestFirst") },
      ],
    },
  ];
}

const SORT_KEYS = new Set<string>([
  "name-asc",
  "name-desc",
  "added-desc",
  "added-asc",
  "modified-desc",
  "modified-asc",
  "size-desc",
  "size-asc",
]);

export function normalizeFolderSortKey(value: string): FolderSortKey {
  if (value === "date-desc") return "added-desc";
  if (value === "date-asc") return "added-asc";
  if (SORT_KEYS.has(value)) return value as FolderSortKey;
  return "name-asc";
}

function sortKeyTs(value: unknown): string {
  return timestampToISO(value);
}

function compareTs(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  const cmp = sortKeyTs(a).localeCompare(sortKeyTs(b));
  return direction === "asc" ? cmp : -cmp;
}

export function sortStorageFiles(
  files: StorageFile[],
  sort: FolderSortKey,
): StorageFile[] {
  return [...files].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "added-desc":
        return compareTs(a.uploadedAt, b.uploadedAt, "desc");
      case "added-asc":
        return compareTs(a.uploadedAt, b.uploadedAt, "asc");
      case "modified-desc":
        return compareTs(
          a.updatedAt ?? a.uploadedAt,
          b.updatedAt ?? b.uploadedAt,
          "desc",
        );
      case "modified-asc":
        return compareTs(
          a.updatedAt ?? a.uploadedAt,
          b.updatedAt ?? b.uploadedAt,
          "asc",
        );
      case "size-desc":
        return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
      case "size-asc":
        return (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
    }
  });
}

export function sortStorageFolders(
  folders: StorageFolder[],
  sort: FolderSortKey,
): StorageFolder[] {
  return [...folders].sort((a, b) => {
    switch (sort) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "added-desc":
        return compareTs(a.createdAt, b.createdAt, "desc");
      case "added-asc":
        return compareTs(a.createdAt, b.createdAt, "asc");
      case "modified-desc":
        return compareTs(
          a.updatedAt ?? a.createdAt,
          b.updatedAt ?? b.createdAt,
          "desc",
        );
      case "modified-asc":
        return compareTs(
          a.updatedAt ?? a.createdAt,
          b.updatedAt ?? b.createdAt,
          "asc",
        );
      case "size-desc":
      case "size-asc":
        return a.name.localeCompare(b.name);
    }
  });
}
