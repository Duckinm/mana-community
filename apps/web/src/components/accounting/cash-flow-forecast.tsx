import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { QueryErrorPanel } from "@/components/ui/query-error-panel";
import { CashFlowForecastSkeleton } from "@/components/accounting/cash-flow-forecast-skeleton";
import { ChartCardHeader } from "@/components/accounting/chart-helpers";
import { DollarSign } from "@/components/icons";
import { useCurrency, resolveCurrency } from "@/hooks/use-currency";
import { formatMonthYear } from "@/lib/calendar-date";
import { useTranslation } from "react-i18next";

interface ForecastData {
  mrr: number;
  avgMonthlyExpenses: number;
  projectedNet: number;
  forecastMonth: string;
  baseCurrency?: string;
  conversionIncomplete?: boolean;
  hasExpenseHistory?: boolean;
}

function formatCents(cents: number, currency = "USD", locale = "en-US"): string {
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatForecastMonth(ym: string, locale = "en-US"): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return formatMonthYear(date, locale);
}

export function CashFlowForecast() {
  const { t, i18n } = useTranslation("accounting");
  const { currency: globalCurrency } = useCurrency();
  const { data, isLoading, isError, refetch } = useQuery<ForecastData>({
    queryKey: queryKeys.accountingForecast,
    queryFn: async () => {
      const result = await client.api.accounting.forecast.get();
      if (result.error) throw result.error;
      return result.data as ForecastData;
    },
    staleTime: 120_000,
  });

  if (isLoading) return <CashFlowForecastSkeleton />;
  if (isError) return <QueryErrorPanel onRetry={() => void refetch()} className="py-4" />;
  if (!data) return null;

  const displayCurrency = resolveCurrency(data.baseCurrency, globalCurrency);

  const isHealthy = data.projectedNet >= 0;
  // A net of zero because nothing has been recorded is not a positive outlook, and
  // neither is a healthy one built on an expense average taken from no months at all:
  // the window is the three whole months before this one, so a new account has none.
  const hasSignal =
    (data.mrr !== 0 || data.avgMonthlyExpenses !== 0) && data.hasExpenseHistory !== false;
  const interpretation = !hasSignal
    ? t("forecast.noData")
    : isHealthy
      ? t("forecast.healthy")
      : t("forecast.unhealthy");

  const rows: { label: string; value: string; color?: string }[] = [
    {
      label: t("forecast.mrr"),
      value: formatCents(data.mrr, displayCurrency.code, displayCurrency.locale),
      color: "var(--primary)",
    },
    {
      label: t("forecast.avgMonthlyExpenses"),
      value: formatCents(data.avgMonthlyExpenses, displayCurrency.code, displayCurrency.locale),
      color: "var(--color-destructive)",
    },
    {
      label: t("forecast.projectedNet"),
      value: formatCents(data.projectedNet, displayCurrency.code, displayCurrency.locale),
      color: isHealthy ? "var(--primary)" : "var(--color-destructive)",
    },
  ];

  return (
    <div className="surface-card rounded-xl p-4 h-full flex flex-col">
      <ChartCardHeader
        icon={DollarSign}
        label={t("forecast.title")}
        color="var(--primary)"
        bg="var(--primary-soft)"
        right={
          <span className="text-xs text-muted-foreground">
            {formatForecastMonth(data.forecastMonth, i18n.language)}
          </span>
        }
      />
      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-0">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span
                className="text-sm font-medium tabular-nums"
                style={{ color: row.color }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {data.conversionIncomplete && (
          <p className="text-xs text-warning mt-3 px-2 py-1.5 rounded-lg" style={{ background: "var(--warning-soft)" }}>
            {t("conversionIncomplete")}
          </p>
        )}
        <p
          className="text-xs mt-4 px-3 py-2 rounded-lg font-medium"
          style={{
            color: isHealthy ? "var(--primary)" : "var(--color-destructive)",
            background: isHealthy ? "var(--primary-soft)" : "var(--danger-soft)",
          }}
        >
          {interpretation}
        </p>
      </div>
    </div>
  );
}
