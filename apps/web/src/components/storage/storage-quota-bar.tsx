import { StorageQuotaBarSkeleton } from "@/components/storage/storage-quota-bar-skeleton";
import type { FileKind } from "@/components/storage/types";
import { AlertTriangle, HardDrive } from "@/components/icons";
import { useStorage } from "@/context/storage";
import { useStorageQuota } from "@/hooks/use-storage-quota";
import { formatBytes } from "@/lib/format-bytes";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const CATEGORIES = [
  { key: "docs", kinds: ["pdf", "doc", "sheet"] as FileKind[], labelKey: "categoryDocs", color: "var(--category-purple)" },
  { key: "images", kinds: ["image"] as FileKind[], labelKey: "categoryImages", color: "var(--primary)" },
  { key: "other", kinds: ["video", "archive", "other"] as FileKind[], labelKey: "categoryOther", color: "var(--category-orange)" },
] as const;

function useStorageBreakdown() {
  const { files } = useStorage();
  return useMemo(
    () =>
      CATEGORIES.map((category) => ({
        ...category,
        bytes: files.reduce(
          (sum, f) => (category.kinds.includes(f.kind) ? sum + f.sizeBytes : sum),
          0,
        ),
      })),
    [files],
  );
}

export function StorageQuotaBar({ compact }: { compact?: boolean }) {
  const { t } = useTranslation("storage");
  const { usedBytes, quotaBytes, percent, isPending, isFull, isAlmostFull } =
    useStorageQuota();
  const breakdown = useStorageBreakdown();

  if (isPending) {
    return <StorageQuotaBarSkeleton compact={compact} />;
  }

  const barColor =
    percent >= 90 ? "bg-danger" : percent >= 70 ? "bg-warning" : "bg-primary/40";

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-2xs font-semibold text-foreground">
            <HardDrive
              size={12}
              strokeWidth={1.75}
              className="shrink-0 text-muted-foreground"
            />
            {t("storageLabel")}
          </span>
          <span className="shrink-0 text-2xs tabular-nums text-caption">
            {formatBytes(usedBytes)} / {quotaBytes === null ? t("settings:billing.usage.unlimited") : formatBytes(quotaBytes)}
          </span>
        </div>
        <div className="flex w-full h-1.5 rounded-full bg-border overflow-hidden gap-px">
          {breakdown.map(
            (category) =>
              category.bytes > 0 && (
                <div
                  key={category.key}
                  className="h-full transition-all duration-slow"
                  style={{
                    width: `${(category.bytes / Math.max(usedBytes, 1)) * Math.max(percent, 0.5)}%`,
                    background: category.color,
                  }}
                />
              ),
          )}
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
          {breakdown.map(
            (category) =>
              category.bytes > 0 && (
                <div key={category.key} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: category.color }}
                  />
                  <span className="text-2xs text-caption">
                    {t(category.labelKey)} {formatBytes(category.bytes)}
                  </span>
                </div>
              ),
          )}
        </div>
        {isAlmostFull && (
          <Link
            to="/settings/integrations"
            className="flex items-center gap-0.5 text-2xs text-warning hover:opacity-80 transition-opacity"
          >
            <AlertTriangle size={9} />
            {isFull ? t("storageFull") : t("storageAlmostFull")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-2 mt-auto border-t border-border-subtle">
      <div className="w-full h-1 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-slow ${barColor}`}
          style={{ width: `${Math.max(percent, 0.5)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-2xs text-caption">{formatBytes(usedBytes)} used</span>
        <span className="text-2xs text-caption">{quotaBytes === null ? t("settings:billing.usage.unlimited") : formatBytes(quotaBytes)}</span>
      </div>

      {isAlmostFull && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5">
          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-2xs text-warning font-medium leading-tight">
              {isFull ? t("storageFull") : t("storageAlmostFull")}
            </p>
            <p className="text-2xs text-caption leading-tight mt-0.5">{t("quotaFullHint")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
