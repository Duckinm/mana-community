import type { CategorySpendStats } from "@/components/accounting/budget-helpers";
import { formatMoney } from "@/components/accounting/budget-helpers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Currency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface BudgetCategoryChipsProps {
  categories: string[];
  spendStats: Map<string, CategorySpendStats>;
  value: string;
  onChange: (category: string) => void;
  onBlur: () => void;
  currency: Currency;
  error?: string;
  customOpen: boolean;
  onCustomOpen: () => void;
}

export function BudgetCategoryChips({
  categories,
  spendStats,
  value,
  onChange,
  onBlur,
  currency,
  error,
  customOpen,
  onCustomOpen,
}: BudgetCategoryChipsProps) {
  const { t } = useTranslation("accounting");

  return (
    <div>
      <Label>{t("budgets.category")}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {categories.map((category) => {
          const stats = spendStats.get(category);
          const selected = value === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-left transition-colors duration-fast",
                selected
                  ? "bg-primary-soft border-primary-border text-primary"
                  : "bg-surface-raised border-border-subtle text-foreground hover:border-border-default",
              )}
            >
              <p className="text-xs font-medium leading-tight">{category}</p>
              {stats && stats.avgCents > 0 && (
                <p className="text-2xs text-muted-foreground mt-0.5 tabular-nums">
                  {t("budgets.avgPerMonth", {
                    amount: formatMoney(stats.avgCents, currency.code, currency.locale),
                  })}
                </p>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCustomOpen}
          className={cn(
            "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors duration-fast",
            customOpen
              ? "bg-primary-soft border-primary-border text-primary"
              : "bg-surface-raised border-border-subtle text-muted-foreground hover:border-border-default",
          )}
        >
          {t("budgets.newCategory")}
        </button>
      </div>
      {customOpen && (
        <Input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={t("budgets.newCategoryPlaceholder")}
          className="mt-2"
        />
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
