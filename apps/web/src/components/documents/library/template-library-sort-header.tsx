import { ArrowDown, ArrowDownUp, ArrowUp } from "@/components/icons";
import type {
  SortDir,
  SortField,
} from "@/components/documents/library/template-library-types";
import { cn } from "@/lib/utils";

export const libraryTableHeader =
  "flex h-9 shrink-0 items-center gap-3 border-b border-border-subtle px-4 xl:gap-4";

export function SortHeaderCell({
  label,
  field,
  active,
  dir,
  onClick,
  className,
  reverse,
}: {
  label: string;
  field: SortField;
  active: boolean;
  dir: SortDir;
  onClick: (field: SortField) => void;
  className?: string;
  reverse?: boolean;
}) {
  const Icon = !active ? ArrowDownUp : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={cn(
        "group/sort inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider transition-colors",
        reverse && "flex-row-reverse",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
      <Icon
        size={12}
        className={
          active ? "opacity-100" : "opacity-0 group-hover/sort:opacity-60"
        }
      />
    </button>
  );
}
