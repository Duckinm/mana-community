import { Check, Plus, Search } from "@/components/icons";
import {
  categoryIcon,
  rankCategories,
} from "@/components/finance/transaction-modal-helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface TransactionCategoryGridProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  usage: Record<string, number>;
  onCreateCategory: (name: string) => void;
  accentColor: string;
  error?: string;
}

export function TransactionCategoryGrid({
  value,
  onChange,
  categories,
  usage,
  onCreateCategory,
  accentColor,
  error,
}: TransactionCategoryGridProps) {
  const { t } = useTranslation("accounting");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const ranked = useMemo(
    () => rankCategories(categories, usage),
    [categories, usage],
  );

  const top = useMemo(() => {
    const first = ranked.slice(0, 6);
    if (value && !first.some((c) => c.toLowerCase() === value.toLowerCase())) {
      return [value, ...first].slice(0, 6);
    }
    return first;
  }, [ranked, value]);

  const filtered = ranked.filter((c) =>
    c.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const trimmedQuery = query.trim();
  const canCreate =
    trimmedQuery.length > 0 &&
    !categories.some((c) => c.toLowerCase() === trimmedQuery.toLowerCase());

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div>
      <Label className="mb-1.5 block">
        {t("transactions.modal.category")}{" "}
        <span className="text-destructive">*</span>
      </Label>
      <div className="grid grid-cols-3 gap-2">
        {top.map((cat) => {
          const Icon = categoryIcon(cat);
          const active = value.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onChange(cat)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-all duration-base",
                active
                  ? "border-transparent"
                  : "border-border-subtle hover:border-border-default",
              )}
              style={
                active
                  ? {
                      background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                      boxShadow: `inset 0 0 0 1px ${accentColor}`,
                    }
                  : undefined
              }
            >
              <Icon
                size={16}
                strokeWidth={2}
                style={{ color: active ? accentColor : "var(--text-muted)" }}
              />
              <span
                className="w-full truncate text-center text-2xs font-medium"
                style={{ color: active ? accentColor : "var(--text-primary)" }}
                title={cat}
              >
                {cat}
              </span>
            </button>
          );
        })}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border-default px-2 py-2.5 text-muted-foreground transition-colors duration-base hover:border-border-strong hover:text-foreground"
            >
              <Search size={16} strokeWidth={2} />
              <span className="text-2xs font-medium">
                {t("transactions.modal.more")}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="border-b border-border-subtle p-2">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("transactions.modal.categorySearchPlaceholder")}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map((cat) => {
                const Icon = categoryIcon(cat);
                const active = value.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => select(cat)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-fast hover:bg-accent"
                  >
                    <Icon
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="flex-1 truncate text-foreground">{cat}</span>
                    {active && <Check size={13} style={{ color: accentColor }} />}
                  </button>
                );
              })}
              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateCategory(trimmedQuery);
                    select(trimmedQuery);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-fast hover:bg-accent",
                    filtered.length > 0 && "mt-1 border-t border-border-subtle",
                  )}
                  style={{ color: accentColor }}
                >
                  <Plus size={13} />
                  {t("transactions.modal.createCategory", {
                    name: trimmedQuery,
                  })}
                </button>
              )}
              {filtered.length === 0 && !canCreate && (
                <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                  {t("transactions.modal.noCategories")}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
