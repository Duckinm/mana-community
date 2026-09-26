import { BudgetAmountSliderField } from "@/components/accounting/budget-amount-slider-field";
import { BudgetCategoryChips } from "@/components/accounting/budget-category-chips";
import {
  calendarMonthKeysBack,
  computeCategorySpendStats,
  formatMoney,
} from "@/components/accounting/budget-helpers";
import {
  BUDGET_PERIODS,
  BudgetPeriodChips,
  PERIOD_LABEL_KEYS,
  PERIOD_SHORT_KEYS,
  type BudgetPeriod,
} from "@/components/accounting/budget-period-chips";
import { X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import { todayCalendarDate } from "@/lib/calendar-date";
import { client } from "@/lib/eden";
import i18next from "@/lib/i18n";
import { mergeCategoryLists } from "@/lib/merge-category-lists";
import { fieldError } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export interface Budget {
  id: string;
  category: string;
  amountCents: number;
  period: string;
  currency: string;
}

const AVG_MONTHS = 3;
const SPARKLINE_MONTHS = 6;

const budgetSchema = z.object({
  category: z
    .string()
    .min(1, i18next.t("budgets.categoryRequired", { ns: "accounting" })),
  amount: z
    .string()
    .min(1, i18next.t("budgets.amountRequired", { ns: "accounting" }))
    .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: i18next.t("budgets.amountMustBePositive", { ns: "accounting" }),
    }),
  period: z.enum(BUDGET_PERIODS),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormDialogProps {
  initialData?: Budget;
  onSave: (values: BudgetFormValues) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
  categories: string[];
  existingBudgets: Budget[];
}

export function BudgetFormDialog({
  initialData,
  onSave,
  onClose,
  isPending,
  categories,
  existingBudgets,
}: BudgetFormDialogProps) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();
  const [amountTouched, setAmountTouched] = useState(Boolean(initialData));
  const [customCategoryOpen, setCustomCategoryOpen] = useState(false);

  const monthKeys = useMemo(
    () => calendarMonthKeysBack(SPARKLINE_MONTHS, todayCalendarDate().slice(0, 7)),
    [],
  );
  const dateFrom = `${monthKeys[0]}-01`;

  const { data: recentExpenses = [] } = useQuery({
    queryKey: ["budget-spend-history", dateFrom],
    queryFn: async () => {
      const result = await client.api.finance.transactions.get({
        query: { type: "expense", dateFrom, limit: "100" },
      });
      if (result.error) throw result.error;
      return result.data.data;
    },
    staleTime: 5 * 60_000,
  });

  const spendStats = useMemo(
    () => computeCategorySpendStats(recentExpenses, monthKeys, AVG_MONTHS),
    [recentExpenses, monthKeys],
  );

  const chipCategories = useMemo(
    () =>
      mergeCategoryLists(categories, Array.from(spendStats.keys())).sort(
        (a, b) => (spendStats.get(b)?.avgCents ?? 0) - (spendStats.get(a)?.avgCents ?? 0),
      ),
    [categories, spendStats],
  );

  const form = useForm({
    defaultValues: {
      category: initialData?.category ?? "",
      amount: initialData ? String(initialData.amountCents / 100) : "",
      period: (initialData?.period ?? "monthly") as BudgetPeriod,
    },
    validators: { onSubmit: budgetSchema },
    onSubmit: async ({ value }) => {
      await onSave(value);
    },
  });

  function applyCategory(handleChange: (v: string) => void, category: string) {
    handleChange(category);
    if (!amountTouched) {
      const avgCents = spendStats.get(category)?.avgCents ?? 0;
      if (avgCents > 0) form.setFieldValue("amount", (avgCents / 100).toFixed(2));
    }
  }

  function isDuplicate(category: string, period: string) {
    return existingBudgets.some(
      (b) =>
        b.id !== initialData?.id &&
        b.category.trim().toLowerCase() === category.trim().toLowerCase() &&
        b.period === period,
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-end sm:items-center justify-center px-4 pb-24 sm:pb-0 bg-surface-overlay/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[min(85vh,680px)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-input bg-modal shadow-modal"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 pt-5 pb-3">
          <h3 className="text-xl font-semibold text-foreground">
            {initialData ? t("budgets.editBudget") : t("budgets.newBudget")}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t("budgets.close")}
          >
            <X size={14} strokeWidth={1.5} className="text-foreground opacity-40" />
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <form.Field
              name="category"
              validators={{ onChange: budgetSchema.shape.category }}
            >
              {(field) => (
                <BudgetCategoryChips
                  categories={chipCategories}
                  spendStats={spendStats}
                  value={field.state.value}
                  onChange={(category) => {
                    setCustomCategoryOpen(false);
                    applyCategory(field.handleChange, category);
                  }}
                  onBlur={field.handleBlur}
                  currency={currency}
                  customOpen={customCategoryOpen}
                  onCustomOpen={() => setCustomCategoryOpen(true)}
                  error={
                    field.state.meta.isTouched
                      ? fieldError(field.state.meta.errors)
                      : undefined
                  }
                />
              )}
            </form.Field>

            <form.Subscribe selector={(s) => s.values.category}>
              {(selectedCategory) => {
                const stats = spendStats.get(selectedCategory);
                return (
                  <form.Field
                    name="amount"
                    validators={{ onChange: budgetSchema.shape.amount }}
                  >
                    {(field) => (
                      <BudgetAmountSliderField
                        value={field.state.value}
                        onChange={(v) => {
                          setAmountTouched(true);
                          field.handleChange(v);
                        }}
                        onBlur={field.handleBlur}
                        currency={currency}
                        avgCents={stats?.avgCents ?? 0}
                        sparkline={stats?.sparkline ?? []}
                        error={
                          field.state.meta.isTouched
                            ? fieldError(field.state.meta.errors)
                            : undefined
                        }
                      />
                    )}
                  </form.Field>
                );
              }}
            </form.Subscribe>

            <form.Field name="period">
              {(field) => (
                <BudgetPeriodChips
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>

            <form.Subscribe
              selector={(s) => [s.values.category, s.values.period] as const}
            >
              {([selectedCategory, selectedPeriod]) => {
                if (!isDuplicate(selectedCategory, selectedPeriod)) return null;

                return (
                  <p className="text-xs text-destructive">
                    {t("budgets.duplicateBudget", {
                      category: selectedCategory,
                      period: t(PERIOD_LABEL_KEYS[selectedPeriod]).toLowerCase(),
                    })}
                  </p>
                );
              }}
            </form.Subscribe>
          </div>

          <div className="drawer-footer">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-surface-raised disabled:opacity-50"
            >
              {t("budgets.cancel")}
            </button>
            <form.Subscribe
              selector={(s) => [
                s.values.category,
                s.values.period,
                s.values.amount,
                s.canSubmit,
              ] as const}
            >
              {([selectedCategory, selectedPeriod, amount, canSubmit]) => {
                const duplicate = isDuplicate(selectedCategory, selectedPeriod);
                const amountCents = Math.round((parseFloat(amount) || 0) * 100);
                const avgCents = spendStats.get(selectedCategory)?.avgCents ?? 0;
                const label =
                  avgCents > 0 && amountCents > 0
                    ? t("budgets.ctaWithAverage", {
                        amount: formatMoney(amountCents, currency.code, currency.locale),
                        period: t(PERIOD_SHORT_KEYS[selectedPeriod]),
                        avg: formatMoney(avgCents, currency.code, currency.locale),
                      })
                    : initialData
                      ? t("budgets.saveChanges")
                      : t("budgets.addBudget");

                return (
                  <button
                    type="submit"
                    disabled={!canSubmit || isPending || duplicate}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
                  >
                    {label}
                  </button>
                );
              }}
            </form.Subscribe>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
