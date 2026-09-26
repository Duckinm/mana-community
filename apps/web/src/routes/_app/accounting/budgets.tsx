import { BudgetCharts } from "@/components/accounting/budget-charts";
import { BudgetPanel } from "@/components/accounting/budget-panel";
import { client } from "@/lib/eden";
import { fadeUp, motionTransition, panelFadeUp } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_app/accounting/budgets")({
  component: BudgetsPage,
});

interface CategoryRow {
  category: string;
  amount: number;
  type: string;
}

function BudgetsPage() {
  const { t } = useTranslation("accounting");
  const { data: summary } = useQuery({
    queryKey: queryKeys.accountingSummary("month"),
    queryFn: async () => {
      const result = await client.api.accounting.summary.get({
        query: { period: "month" },
      });
      if (result.error) throw result.error;
      return result.data as { byCategory: CategoryRow[] };
    },
    staleTime: 60_000,
  });

  const byCategory = summary?.byCategory ?? [];

  const spentMap = byCategory.reduce<Record<string, number>>((acc, row) => {
    if (row.type === "expense")
      acc[row.category] = (acc[row.category] ?? 0) + row.amount;
    return acc;
  }, {});

  return (
    <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
      <div className="page-pad mx-auto w-full max-w-5xl">
        <motion.div
          {...fadeUp}
          className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
        >
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {t("budgets.pageTitle")}
          </h1>
          <p className="text-xs text-muted-foreground max-xl:sr-only">
            {t("budgets.pageSub")}
          </p>
        </motion.div>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <motion.div
            {...panelFadeUp}
            transition={motionTransition(undefined, 0.05)}
            className="lg:sticky lg:top-8"
          >
            <BudgetCharts />
          </motion.div>

          <motion.div
            {...panelFadeUp}
            transition={motionTransition(undefined, 0.1)}
          >
            <BudgetPanel spentMap={spentMap} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
