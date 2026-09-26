import { AccountingCharts } from "@/components/accounting/accounting-charts";
import { AccountingDashboardSkeleton } from "@/components/accounting/accounting-dashboard-skeleton";
import { CashFlowForecast } from "@/components/accounting/cash-flow-forecast";
import { ChartCardHeader } from "@/components/accounting/chart-helpers";
import { AiNarrativeCard } from "@/components/finance/ai-narrative-card";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { client } from "@/lib/eden";
import { fadeIn, fadeUp, motionTransition, panelFadeUp } from "@/lib/motion";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  DollarSign,
  Receipt,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "@/components/icons";
import { useCurrency, resolveCurrency } from "@/hooks/use-currency";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type Period = "month" | "last_month" | "quarter" | "year";

interface AccountingSummary {
  revenue: number;
  expenses: number;
  net: number;
  taxEstimate: number;
  baseCurrency: string;
  conversionIncomplete?: boolean;
  byCurrency: {
    currency: string;
    revenue: number;
    expenses: number;
    net: number;
  }[];
  byMonth: { month: string; revenue: number; expenses: number }[];
  byCategory: { category: string; amount: number; type: string }[];
}

const PERIOD_TABS: { value: Period; key: string }[] = [
  { value: "month", key: "month" },
  { value: "last_month", key: "lastMonth" },
  { value: "quarter", key: "quarter" },
  { value: "year", key: "year" },
];

function formatCents(
  cents: number,
  currency = "USD",
  locale = "en-US",
): string {
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AccountingDashboard() {
  const { t, i18n } = useTranslation("accounting");
  const { currency } = useCurrency();
  const [period, setPeriod] = useState<Period>("month");

  const { data, isError, refetch } = useQuery({
    queryKey: queryKeys.accountingSummary(period),
    queryFn: async () => {
      const result = await client.api.accounting.summary.get({
        query: { period },
      });
      if (result.error) throw result.error;
      return result.data as AccountingSummary;
    },
    staleTime: 60_000,
  });

  if (isError) {
    return (
      <div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
        <div className="page-pad mx-auto w-full max-w-5xl">
          <QueryErrorPanel onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  const summary = data;

  const displayCurrency = resolveCurrency(summary?.baseCurrency, currency);

  const cards = summary && [
    {
      label: t("cards.revenue"),
      value: formatCents(
        summary.revenue,
        displayCurrency.code,
        displayCurrency.locale,
      ),
      icon: TrendingUp,
      color: "var(--primary)",
      bg: "var(--primary-soft)",
      stripColor: "var(--success)",
    },
    {
      label: t("cards.expenses"),
      value: formatCents(
        summary.expenses,
        displayCurrency.code,
        displayCurrency.locale,
      ),
      icon: TrendingDown,
      color: "var(--color-destructive)",
      bg: "var(--danger-soft)",
      stripColor: "var(--danger)",
    },
    {
      label: t("cards.net"),
      value: formatCents(
        summary.net,
        displayCurrency.code,
        displayCurrency.locale,
      ),
      icon: DollarSign,
      color: summary.net >= 0 ? "var(--primary)" : "var(--color-destructive)",
      bg: summary.net >= 0 ? "var(--primary-soft)" : "var(--danger-soft)",
      stripColor: summary.net >= 0 ? "var(--text-primary)" : "var(--danger)",
    },
    {
      label: t("cards.taxEstimate"),
      value: formatCents(
        summary.taxEstimate,
        displayCurrency.code,
        displayCurrency.locale,
      ),
      icon: Receipt,
      color: "var(--warning)",
      bg: "var(--warning-soft)",
      stripColor: "var(--warning)",
    },
  ];

  return (
    <motion.div className="page-scroll pb-6 pt-5 max-xl:pb-mobile-dock xl:pb-8 xl:pt-8">
      <div className="page-pad mx-auto w-full max-w-5xl">
        <motion.div
          {...fadeUp}
          className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
        >
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-xs text-muted-foreground max-xl:sr-only">
            {t("pageSub")}
          </p>
        </motion.div>

        <motion.div
          {...panelFadeUp}
          transition={motionTransition(undefined, 0.05)}
          className="mb-5 grid w-full grid-cols-4 gap-1.5 rounded-xl bg-muted p-1 xl:flex xl:w-fit"
        >
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPeriod(tab.value)}
              className="min-w-0 rounded-lg px-1.5 py-1.5 text-xs font-medium transition-all xl:px-3.5"
              style={{
                background:
                  period === tab.value ? "var(--card)" : "transparent",
                color:
                  period === tab.value
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                boxShadow: period === tab.value ? "var(--shadow-card)" : "none",
              }}
            >
              {t(`period.${tab.key}`)}
            </button>
          ))}
        </motion.div>

        {summary?.conversionIncomplete && (
          <motion.p
            {...fadeIn}
            className="text-xs text-warning mb-4 px-3 py-2 rounded-lg"
            style={{ background: "var(--warning-soft)" }}
          >
            {t("conversionIncomplete")}
          </motion.p>
        )}

        {cards ? (
          <>
            <motion.div
              {...panelFadeUp}
              transition={motionTransition(undefined, 0.1)}
              className="surface-card mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border-subtle min-[360px]:grid-cols-2 md:hidden"
            >
              {cards.map((card) => (
                <div key={card.label} className="min-w-0 bg-card px-4 py-3.5">
                  <p className="mb-1 text-xs font-medium text-foreground/75">
                    {card.label}
                  </p>
                  <p
                    className="break-words font-mono text-lg font-semibold tracking-tight"
                    style={{ color: card.stripColor }}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </motion.div>

            <div className="mb-5 hidden grid-cols-2 gap-3 md:grid xl:grid-cols-4">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    {...panelFadeUp}
                    transition={motionTransition(undefined, i * 0.04 + 0.12)}
                    className="surface-card relative overflow-hidden rounded-xl p-4"
                  >
                    <div
                      className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-10 blur-2xl"
                      style={{ background: card.color }}
                    />
                    <div
                      className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: card.bg }}
                    >
                      <Icon
                        size={14}
                        style={{ color: card.color }}
                        strokeWidth={2}
                      />
                    </div>
                    <p className="mb-1 text-xs font-medium text-foreground/75">
                      {card.label}
                    </p>
                    <p
                      className="font-sans text-xl font-light tracking-tight"
                      style={{ color: card.color }}
                    >
                      {card.value}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <AccountingDashboardSkeleton />
        )}

        <AccountingCharts
          sideIncome={
            !!summary &&
            summary.byCurrency.length > 1 && (
              <div className="surface-card rounded-xl p-4">
                <ChartCardHeader
                  icon={Wallet}
                  label={t("byCurrency")}
                  color="var(--category-orange)"
                  bg="var(--category-orange-soft)"
                />
                <div className="space-y-3">
                  {summary.byCurrency.map((row) => (
                    <div
                      key={row.currency}
                      className="space-y-1 pb-3 border-b border-border last:border-0 last:pb-0"
                    >
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md bg-category-orange-soft text-category-orange">
                        {row.currency}
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("rev")}
                        </span>
                        <span className="text-primary font-medium tabular-nums">
                          {formatCents(
                            row.revenue,
                            row.currency,
                            i18n.language,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("exp")}
                        </span>
                        <span className="text-destructive font-medium tabular-nums">
                          {formatCents(
                            row.expenses,
                            row.currency,
                            i18n.language,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t("cards.net")}
                        </span>
                        <span
                          className="font-medium tabular-nums"
                          style={{
                            color:
                              row.net >= 0
                                ? "var(--primary)"
                                : "var(--color-destructive)",
                          }}
                        >
                          {formatCents(row.net, row.currency, i18n.language)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          sideExpenses={
            !!summary &&
            summary.byCategory.length > 0 && (
              <div className="surface-card rounded-xl p-4">
                <ChartCardHeader
                  icon={Tag}
                  label={t("byCategory")}
                  color="var(--category-purple)"
                  bg="var(--category-purple-soft)"
                />
                <div className="space-y-2.5">
                  {summary.byCategory.slice(0, 8).map((row) => (
                    <div
                      key={`${row.category}-${row.type}`}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background:
                              row.type === "revenue"
                                ? "var(--primary)"
                                : "var(--color-destructive)",
                            boxShadow: `0 0 0 3px ${row.type === "revenue" ? "var(--primary-soft)" : "var(--danger-soft)"}`,
                          }}
                        />
                        <span className="text-sm text-foreground">
                          {row.category}
                        </span>
                      </div>
                      <span
                        className="text-sm font-medium tabular-nums"
                        style={{
                          color:
                            row.type === "revenue"
                              ? "var(--primary)"
                              : "var(--color-destructive)",
                        }}
                      >
                        {row.type === "expense" ? "-" : "+"}
                        {formatCents(
                          row.amount,
                          displayCurrency.code,
                          displayCurrency.locale,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        />

        <motion.div
          {...panelFadeUp}
          transition={motionTransition(undefined, 0.25)}
          className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 mb-5"
        >
          <CashFlowForecast />
          <AiNarrativeCard />
        </motion.div>
      </div>
    </motion.div>
  );
}
