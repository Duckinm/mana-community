import {
  barBg,
  barColor,
  barFillPct,
  formatMoney,
  utilizationPct,
} from "@/components/accounting/budget-helpers";
import {
  BudgetFormDialog,
  type Budget,
  type BudgetFormValues,
} from "@/components/accounting/budget-form-dialog";
import { BudgetPanelSkeleton } from "@/components/accounting/budget-panel-skeleton";
import {
  PERIOD_LABEL_KEYS,
  type BudgetPeriod,
} from "@/components/accounting/budget-period-chips";
import { Pencil, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/eden";
import { useCurrency } from "@/hooks/use-currency";
import { mergeCategoryLists } from "@/lib/merge-category-lists";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type { Budget } from "@/components/accounting/budget-form-dialog";

interface SpentMap {
  [category: string]: number;
}

interface BudgetRowProps {
  budget: Budget;
  spentCents: number;
  confirmDeleteId: string | null;
  deletePending: boolean;
  onEdit: () => void;
  onToggleDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function BudgetRow({
  budget,
  spentCents,
  confirmDeleteId,
  deletePending,
  onEdit,
  onToggleDelete,
  onConfirmDelete,
  onCancelDelete,
}: BudgetRowProps) {
  const { t } = useTranslation("accounting");
  const { currency } = useCurrency();
  const format = (cents: number) =>
    formatMoney(cents, currency.code, currency.locale);
  const utilization = utilizationPct(spentCents, budget.amountCents);
  const barPct = barFillPct(spentCents, budget.amountCents);
  const color = barColor(Math.min(utilization, 100));
  const bg = barBg(Math.min(utilization, 100));
  const isOverBudget = spentCents > budget.amountCents;
  const isDeleting = confirmDeleteId === budget.id;

  if (isDeleting) {
    return (
      <div className="px-4 py-2.5 flex items-center gap-2 bg-danger-soft/40">
        <p className="flex-1 text-xs text-muted-foreground truncate">
          {t("budgets.deleteConfirm", { category: budget.category })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onCancelDelete}
        >
          {t("budgets.cancel")}
        </Button>
        <button
          type="button"
          disabled={deletePending}
          onClick={onConfirmDelete}
          className="px-2 py-1 rounded text-xs font-semibold text-destructive bg-danger-soft hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {t("budgets.delete")}
        </button>
      </div>
    );
  }

  const visibleBarPct = barPct > 0 ? Math.max(barPct, 3) : 0;

  return (
    <div className="group px-4 py-3 hover:bg-surface-raised/50 transition-colors">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {budget.category}
          </p>
          <p className="text-2xs text-muted-foreground capitalize mt-0.5">
            {t(
              PERIOD_LABEL_KEYS[budget.period as BudgetPeriod] ?? budget.period,
            )}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p
            className={`text-sm font-mono tabular-nums font-medium leading-tight ${isOverBudget ? "text-destructive" : "text-foreground"}`}
            title={t("budgets.spentThisMonth")}
          >
            {format(spentCents)}
          </p>
          <p className="text-2xs font-mono tabular-nums text-muted-foreground mt-0.5">
            {t("budgets.of", { amount: format(budget.amountCents) })}
          </p>
        </div>

        <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 xl:flex shrink-0 -mr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onEdit}
            aria-label={t("budgets.editAria")}
          >
            <Pencil size={11} className="text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost-danger"
            size="icon-xs"
            onClick={onToggleDelete}
            aria-label={t("budgets.deleteAria")}
          >
            <Trash2 size={11} />
          </Button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <div
          className="flex-1 h-2 rounded-full overflow-hidden border border-border-subtle"
          style={{ background: bg }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${visibleBarPct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
        <span
          className="text-xs font-semibold tabular-nums w-9 text-right shrink-0"
          style={{ color: isOverBudget ? "var(--destructive)" : color }}
        >
          {utilization}%
        </span>
      </div>
    </div>
  );
}

interface BudgetPanelProps {
  spentMap?: SpentMap;
}

export function BudgetPanel({ spentMap = {} }: BudgetPanelProps) {
  const { t } = useTranslation("accounting");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: queryKeys.budgets,
    queryFn: async () => {
      const result = await client.api.budgets.get();
      if (result.error) throw result.error;
      return (result.data ?? []) as unknown as Budget[];
    },
    staleTime: 60_000,
  });

  const budgetCategories = useMemo(
    () => mergeCategoryLists(budgets.map((b) => b.category)),
    [budgets],
  );

  const addMutation = useMutation({
    mutationFn: async (payload: {
      category: string;
      amountCents: number;
      period: string;
    }) => {
      const result = await client.api.budgets.post(payload);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accountingChart,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { category: string; amountCents: number; period: string };
    }) => {
      const result = await client.api.budgets({ id }).patch(payload);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accountingChart,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await client.api.budgets({ id }).delete();
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgets });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accountingChart,
      });
    },
  });

  if (isLoading) return <BudgetPanelSkeleton />;

  async function handleSave(values: BudgetFormValues) {
    const amountCents = Math.round(parseFloat(values.amount) * 100);
    if (editingBudget) {
      await updateMutation.mutateAsync({
        id: editingBudget.id,
        payload: {
          category: values.category,
          amountCents,
          period: values.period,
        },
      });
    } else {
      await addMutation.mutateAsync({
        category: values.category,
        amountCents,
        period: values.period,
      });
    }
    setDialogOpen(false);
    setEditingBudget(null);
  }

  const sortedBudgets = [...budgets].sort((a, b) => {
    const spentA = spentMap[a.category] ?? 0;
    const spentB = spentMap[b.category] ?? 0;
    return (
      utilizationPct(spentB, b.amountCents) -
      utilizationPct(spentA, a.amountCents)
    );
  });

  return (
    <>
      <div className="list-shell">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
          <p className="text-sm font-semibold text-foreground">
            {t("budgets.title")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingBudget(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={11} strokeWidth={2.5} />
            {t("budgets.add")}
          </Button>
        </div>

        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">
            {t("budgets.noneYet")}
          </p>
        ) : (
          <div className="divide-y divide-border-subtle max-xl:overflow-visible xl:max-h-[min(28rem,60vh)] xl:overflow-y-auto">
            {sortedBudgets.map((budget) => (
              <BudgetRow
                key={budget.id}
                budget={budget}
                spentCents={spentMap[budget.category] ?? 0}
                confirmDeleteId={confirmDeleteId}
                deletePending={deleteMutation.isPending}
                onEdit={() => {
                  setEditingBudget(budget);
                  setDialogOpen(true);
                }}
                onToggleDelete={() =>
                  setConfirmDeleteId(
                    confirmDeleteId === budget.id ? null : budget.id,
                  )
                }
                onConfirmDelete={() => {
                  deleteMutation.mutate(budget.id);
                  setConfirmDeleteId(null);
                }}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {dialogOpen && (
          <BudgetFormDialog
            key={editingBudget?.id ?? "new"}
            initialData={editingBudget ?? undefined}
            onSave={handleSave}
            onClose={() => {
              setDialogOpen(false);
              setEditingBudget(null);
            }}
            isPending={addMutation.isPending || updateMutation.isPending}
            categories={budgetCategories}
            existingBudgets={budgets}
          />
        )}
      </AnimatePresence>
    </>
  );
}
