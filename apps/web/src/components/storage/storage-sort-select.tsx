import {
  getSortOptionGroups,
  type FolderSortKey,
} from "@/components/storage/storage-sort";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function StorageSortSelect({
  value,
  onChange,
  className,
}: {
  value: FolderSortKey;
  onChange: (value: FolderSortKey) => void;
  className?: string;
}) {
  const { t } = useTranslation("storage");
  const groups = getSortOptionGroups(t);

  return (
    <div
      className={cn(
        "relative flex h-9 shrink-0 items-center rounded-lg border border-border bg-card",
        className,
      )}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FolderSortKey)}
        aria-label={t("sortLabel")}
        className="h-full w-full max-w-[7.5rem] appearance-none bg-transparent px-2.5 pr-6 text-xs font-medium text-foreground outline-none cursor-pointer sm:max-w-[10.5rem] sm:px-3 sm:pr-7"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((o) => (
              <option key={o.value} value={o.value} className="bg-background">
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <svg
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        aria-hidden
      >
        <path
          d="M2 3.5L5 6.5L8 3.5"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
