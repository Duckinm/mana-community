import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { AccountingChartsSkeleton } from "@/components/accounting/accounting-charts-skeleton";
import {
  CATEGORY_COLORS,
  CHART_LABEL_STYLE,
  CHART_TICK_STYLE,
  ChartCardHeader,
  CustomTooltip,
  amountFormatter,
  formatMonthKey,
} from "@/components/accounting/chart-helpers";
import { TrendingDown, TrendingUp } from "@/components/icons";
import { useBelowXl } from "@/hooks/use-below-xl";
import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

interface ChartData {
  monthlyIncome: { month: string; amount: number }[];
  expensesByCategory: { category: string; amount: number }[];
  budgetVsActual: { category: string; budget: number; actual: number }[];
  baseCurrency: string;
}

const INCOME_CHART_HEIGHT = 176;
const EXPENSE_ROW_HEIGHT = 36;
const EXPENSE_CHART_MIN_HEIGHT = 112;
const CHART_ROW = "grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-3";

export function AccountingCharts({
  sideIncome,
  sideExpenses,
}: {
  sideIncome?: ReactNode;
  sideExpenses?: ReactNode;
}) {
  const { t, i18n } = useTranslation("accounting");
  const belowXl = useBelowXl();
  const { data, isLoading, isError, refetch } = useQuery<ChartData>({
    queryKey: queryKeys.accountingChart,
    queryFn: async () => {
      const result = await client.api.accounting["chart-data"].get();
      if (result.error) throw result.error;
      return result.data as ChartData;
    },
    staleTime: 120_000,
  });

  if (isLoading) return <AccountingChartsSkeleton />;
  if (isError) return <QueryErrorPanel onRetry={() => void refetch()} className="py-4" />;
  if (!data) return null;

  const monthlyIncome = data.monthlyIncome ?? [];
  const expensesByCategory = data.expensesByCategory ?? [];

  const formatAmount = amountFormatter(data.baseCurrency);

  const hasIncome = monthlyIncome.some((d) => d.amount > 0);
  const hasExpenses = expensesByCategory.length > 0;

  if (!hasIncome && !hasExpenses && !sideIncome && !sideExpenses) return null;

  const expensesChartHeight = Math.max(
    EXPENSE_CHART_MIN_HEIGHT,
    expensesByCategory.length * EXPENSE_ROW_HEIGHT,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3 mb-5"
    >
      {(hasIncome || sideIncome) && (
        <div className={hasIncome && sideIncome ? CHART_ROW : undefined}>
          {hasIncome && (
            <div className="surface-card rounded-xl p-4">
              <ChartCardHeader
                icon={TrendingUp}
                label={t("charts.incomeLast12Months")}
                color="var(--primary)"
                bg="var(--primary-soft)"
              />
              <ResponsiveContainer width="100%" height={INCOME_CHART_HEIGHT}>
                <AreaChart
                  data={monthlyIncome}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--primary)"
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--primary)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value: string) => formatMonthKey(value, i18n.language)}
                    tick={CHART_TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    interval={belowXl ? 2 : 0}
                  />
                  <YAxis
                    tick={CHART_TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAmount}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatAmount} />}
                    labelFormatter={(value) => formatMonthKey(String(value), i18n.language)}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name={t("charts.income")}
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#incomeGradient)"
                    dot={false}
                    activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--surface-card)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {sideIncome}
        </div>
      )}

      {(hasExpenses || sideExpenses) && (
        <div className={hasExpenses && sideExpenses ? CHART_ROW : undefined}>
          {hasExpenses && (
            <div className="surface-card rounded-xl p-4">
              <ChartCardHeader
                icon={TrendingDown}
                label={t("charts.expensesByCategory")}
                color="var(--color-destructive)"
                bg="var(--danger-soft)"
              />
              <ResponsiveContainer width="100%" height={expensesChartHeight}>
                <BarChart
                  data={expensesByCategory}
                  layout="vertical"
                  margin={{ top: 0, right: 44, left: 0, bottom: 0 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={CHART_TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAmount}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={CHART_TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatAmount} />}
                    cursor={{ fill: "var(--border-subtle)" }}
                  />
                  <Bar dataKey="amount" name={t("charts.amount")} radius={[6, 6, 6, 6]} maxBarSize={18}>
                    {expensesByCategory.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="right"
                      formatter={(value: unknown) => formatAmount(Number(value))}
                      style={CHART_LABEL_STYLE}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {sideExpenses}
        </div>
      )}
    </motion.div>
  );
}
