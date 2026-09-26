import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "@/components/icons";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { BudgetChartsSkeleton } from "@/components/accounting/budget-charts-skeleton";
import {
  CATEGORY_COLORS,
  CHART_LEGEND_STYLE,
  CHART_TICK_STYLE,
  CustomTooltip,
  amountFormatter,
  formatMonthKey,
} from "@/components/accounting/chart-helpers";
import { useBelowXl } from "@/hooks/use-below-xl";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface BudgetChartData {
  budgetVsActual: { category: string; budget: number; actual: number }[];
  budgetUtilizationTrend?: {
    month: string;
    categories: { category: string; percent: number }[];
  }[];
  baseCurrency: string;
}

const CHART_MAX_HEIGHT = 240;
const CHART_ROW_HEIGHT = 36;
// Utilization can spike hard on one category (e.g. a one-off subscription charge) — cap the
// axis so that outlier doesn't squash the categories people actually track day-to-day.
const UTILIZATION_CAP = 200;

function formatPercent(value: number): string {
  return `${value}%`;
}

export function BudgetCharts() {
  const { t, i18n } = useTranslation("accounting");
  const [trendOpen, setTrendOpen] = useState(true);
  const belowXl = useBelowXl();

  const { data, isLoading, isError, refetch } = useQuery<BudgetChartData>({
    queryKey: queryKeys.accountingChart,
    queryFn: async () => {
      const result = await client.api.accounting["chart-data"].get();
      if (result.error) throw result.error;
      return result.data as BudgetChartData;
    },
    staleTime: 120_000,
  });

  if (isLoading) return <BudgetChartsSkeleton />;
  if (isError) return <QueryErrorPanel onRetry={() => void refetch()} className="py-4" />;
  if (!data) return null;

  const formatAmount = amountFormatter(data.baseCurrency);
  const budgetVsActual = data.budgetVsActual ?? [];
  const utilizationTrend = data.budgetUtilizationTrend ?? [];

  const categoryNames = Array.from(
    new Set(utilizationTrend.flatMap((entry) => entry.categories.map((c) => c.category))),
  );

  const trendData = utilizationTrend.map((entry) => {
    const row: Record<string, string | number> = { month: entry.month };
    for (const { category, percent } of entry.categories) {
      row[category] = percent;
    }
    return row;
  });

  const hasBudgets = budgetVsActual.length > 0;
  const hasTrend = trendData.length > 0 && categoryNames.length > 0;
  const clippedCategories = categoryNames.filter((category) =>
    trendData.some((row) => Number(row[category] ?? 0) > UTILIZATION_CAP),
  );

  if (!hasBudgets && !hasTrend) return null;

  const barChartInnerHeight = Math.max(140, budgetVsActual.length * CHART_ROW_HEIGHT);
  const barChartScrolls = barChartInnerHeight > CHART_MAX_HEIGHT;

  return (
    <div className="space-y-4">
      {hasBudgets && (
        <div className="surface-card rounded-2xl p-5">
          <p className="text-xs font-medium text-muted-foreground mb-4">
            {t("charts.budgetVsActual")}
          </p>
          <div
            className={cn(barChartScrolls && "max-h-60 overflow-y-auto -mx-1 px-1")}
          >
            <ResponsiveContainer width="100%" height={barChartInnerHeight}>
              <BarChart
                data={budgetVsActual}
                layout="vertical"
                margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
                barGap={3}
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
                  width={84}
                />
                <Tooltip
                  content={<CustomTooltip valueFormatter={formatAmount} />}
                  cursor={{ fill: "var(--border-subtle)" }}
                />
                <Legend
                  wrapperStyle={CHART_LEGEND_STYLE}
                  iconSize={8}
                  iconType="circle"
                />
                <Bar
                  dataKey="budget"
                  name={t("charts.budget")}
                  fill="var(--primary)"
                  fillOpacity={0.25}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="actual"
                  name={t("charts.actual")}
                  fill="var(--category-orange)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasTrend && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setTrendOpen((open) => !open)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-raised/50 transition-colors"
          >
            <p className="text-xs font-medium text-muted-foreground">{t("charts.budgetUtilizationTrend")}</p>
            <ChevronDown
              size={14}
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                trendOpen && "rotate-180",
              )}
            />
          </button>
          {trendOpen && (
            <div className="px-5 pb-5">
              {clippedCategories.length > 0 && (
                <p className="mb-2 text-2xs text-caption">
                  {t("charts.utilizationClipped", {
                    categories: clippedCategories.join(", "),
                    cap: UTILIZATION_CAP,
                  })}
                </p>
              )}
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                    domain={[0, (max: number) => Math.min(UTILIZATION_CAP, Math.max(100, Math.ceil(max / 50) * 50))]}
                    tick={CHART_TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatPercent}
                  />
                  <Tooltip
                    content={<CustomTooltip valueFormatter={formatPercent} />}
                    labelFormatter={(value) => formatMonthKey(String(value), i18n.language)}
                  />
                  <Legend
                    wrapperStyle={CHART_LEGEND_STYLE}
                    iconSize={8}
                    iconType="circle"
                  />
                  {categoryNames.map((category, i) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      name={category}
                      stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
