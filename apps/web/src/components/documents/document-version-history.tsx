import { GuestDocumentView } from "@/components/documents/guest/guest-document-view";
import type { Document } from "@/components/documents/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeDiffFields,
  parseSnapDoc,
} from "@/lib/document-version-diff";
import { formatTimestampRelative } from "@/lib/timestamp";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "@/components/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ApiDocumentVersion } from '@/lib/api-types'

export function VersionDiffModal({
  selectedVersion,
  prevVersion,
  currentDoc,
  onClose,
}: {
  selectedVersion: ApiDocumentVersion;
  prevVersion: ApiDocumentVersion | null;
  currentDoc: Document;
  onClose: () => void;
}) {
  const { t } = useTranslation("documents");
  const [mobileView, setMobileView] = useState<"before" | "after">("after");

  const before = parseSnapDoc(selectedVersion.snapshotJson);
  const after = prevVersion
    ? parseSnapDoc(prevVersion.snapshotJson)
    : currentDoc;
  const diffFields =
    before && after ? computeDiffFields(before, after) : undefined;

  const beforeVersionNum = selectedVersion.version;
  const afterVersionNum = prevVersion ? prevVersion.version : null;
  const beforeLabel = t("versionHistory.before", {
    version: beforeVersionNum,
    date: formatTimestampRelative(selectedVersion.createdAt),
  });
  const afterLabel = afterVersionNum
    ? t("versionHistory.afterWithVersion", {
        version: afterVersionNum,
        date: formatTimestampRelative(prevVersion!.createdAt),
      })
    : t("versionHistory.afterCurrent");

  return (
    <div className="fixed inset-0 z-50 bg-surface-overlay/80 backdrop-blur-sm flex flex-col">
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-raised/80 text-muted-foreground transition-colors hover:text-foreground sm:size-8"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 h-full divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div
            className={`overflow-auto p-4 sm:p-8 bg-surface-page ${mobileView === "after" ? "hidden sm:block" : ""}`}
          >
            <p className="text-2xs uppercase tracking-widest text-danger mb-4">
              {beforeLabel}
            </p>
            {before ? (
              <GuestDocumentView
                document={before}
                diffFields={diffFields}
                isBefore
                otherDocument={after ?? undefined}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t("versionHistory.noData")}</p>
            )}
          </div>
          <div
            className={`overflow-auto p-4 sm:p-8 bg-surface-page ${mobileView === "before" ? "hidden sm:block" : ""}`}
          >
            <p className="text-2xs uppercase tracking-widest text-success mb-4">
              {afterLabel}
            </p>
            {after ? (
              <GuestDocumentView
                document={after}
                diffFields={diffFields}
                isBefore={false}
                otherDocument={before ?? undefined}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t("versionHistory.noData")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="sm:hidden border-t border-border bg-surface-raised px-4 py-2 flex rounded-lg overflow-hidden text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileView("before")}
          className={`min-h-9 flex-1 py-2 font-medium transition-colors ${mobileView === "before" ? "text-danger" : "text-muted-foreground"}`}
        >
          <ChevronLeft size={12} className="inline mr-1" />
          {t("versionHistory.beforeShort")}
        </button>
        <button
          type="button"
          onClick={() => setMobileView("after")}
          className={`min-h-9 flex-1 border-l border-border py-2 font-medium transition-colors ${mobileView === "after" ? "text-success" : "text-muted-foreground"}`}
        >
          {t("versionHistory.afterShort")}
          <ChevronRight size={12} className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

export function VersionHistorySection({
  currentDoc,
  versions,
  versionsLoading,
  versionsOpen,
  onToggle,
}: {
  documentId: string;
  currentDoc: Document;
  versions: ApiDocumentVersion[] | undefined;
  versionsLoading: boolean;
  versionsOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("documents");
  const [selected, setSelected] = useState<{
    version: ApiDocumentVersion;
    idx: number;
  } | null>(null);

  // versions are DESC [v3, v2, v1] — prevVersion (newer) is at idx-1
  const selectedPrev =
    selected && versions && selected.idx > 0
      ? versions[selected.idx - 1]
      : null;

  return (
    <>
      {selected && (
        <VersionDiffModal
          selectedVersion={selected.version}
          prevVersion={selectedPrev ?? null}
          currentDoc={currentDoc}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors duration-fast"
        >
          <span>{t("versionHistory.title")}</span>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform duration-200 ${versionsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {versionsOpen && (
          <div className="border-t border-border">
            {versionsLoading ? (
              <div className="px-4 py-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            ) : !versions || versions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                {t("versionHistory.noVersionsRecorded")}
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {versions.map((v, idx) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelected({ version: v, idx })}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-raised transition-colors duration-fast"
                  >
                    <span className="font-mono font-bold text-sm text-foreground w-8 shrink-0">
                      v{v.version}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestampRelative(v.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
