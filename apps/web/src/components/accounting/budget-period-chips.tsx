import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const BUDGET_PERIODS = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const PERIOD_LABEL_KEYS: Record<BudgetPeriod, string> = {
  weekly: "budgets.periodWeekly",
  monthly: "budgets.periodMonthly",
  quarterly: "budgets.periodQuarterly",
  yearly: "budgets.periodYearly",
};

export const PERIOD_SHORT_KEYS: Record<BudgetPeriod, string> = {
  weekly: "budgets.periodShortWeekly",
  monthly: "budgets.periodShortMonthly",
  quarterly: "budgets.periodShortQuarterly",
  yearly: "budgets.periodShortYearly",
};

interface BudgetPeriodChipsProps {
  value: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
}

export function BudgetPeriodChips({ value, onChange }: BudgetPeriodChipsProps) {
  const { t } = useTranslation("accounting");

  return (
    <div>
      <Label>{t("budgets.periodLabel")}</Label>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-4">
        {BUDGET_PERIODS.map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => onChange(period)}
            className={cn(
              "min-h-11 rounded-lg border px-2 py-2 text-xs font-medium transition-colors duration-fast",
              value === period
                ? "bg-primary-soft border-primary-border text-primary"
                : "bg-surface-raised border-border-subtle text-foreground hover:border-border-default",
            )}
          >
            {t(PERIOD_LABEL_KEYS[period])}
          </button>
        ))}
      </div>
    </div>
  );
}
