export function utilizationPct(spentCents: number, budgetCents: number): number {
  if (budgetCents <= 0) return 0;
  return Math.round((spentCents / budgetCents) * 100);
}

export function pct(spentCents: number, budgetCents: number): number {
  return Math.min(utilizationPct(spentCents, budgetCents), 100);
}

export function barFillPct(spentCents: number, budgetCents: number): number {
  return pct(spentCents, budgetCents);
}

export function barColor(percent: number): string {
  if (percent >= 90) return "var(--destructive)";
  if (percent >= 70) return "var(--warning)";
  return "var(--primary)";
}

export function barBg(percent: number): string {
  if (percent >= 90) return "var(--danger-soft)";
  if (percent >= 70) return "var(--warning-soft)";
  return "var(--primary-soft)";
}

export function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatMoney(
  cents: number,
  currencyCode: string,
  locale: string,
): string {
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Returns `count` calendar-month keys ("YYYY-MM"), oldest to newest, ending
 * with the given month. Pure string arithmetic — avoids UTC day-shift bugs
 * from doing month math on `Date` objects.
 */
export function calendarMonthKeysBack(count: number, currentMonth: string): string[] {
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const totalMonths = month - 1 - offset;
    const y = year + Math.floor(totalMonths / 12);
    const m = ((totalMonths % 12) + 12) % 12 + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });
}

export interface CategorySpendStats {
  avgCents: number;
  sparkline: number[];
}

interface SpendTransaction {
  category: string;
  amount: number;
  date: string;
}

/**
 * Buckets expense transactions by month, then derives a trailing average
 * (over `avgMonths`) and an oldest-to-newest sparkline (over `sparklineMonths`)
 * per category, keyed against calendar-month strings so partial months don't
 * skew the average toward whichever day the dialog happens to be opened.
 */
export function computeCategorySpendStats(
  transactions: SpendTransaction[],
  monthKeys: string[],
  avgMonths: number,
): Map<string, CategorySpendStats> {
  const byCategory = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    const monthKey = tx.date.slice(0, 7);
    if (!monthKeys.includes(monthKey)) continue;
    const monthMap = byCategory.get(tx.category) ?? new Map<string, number>();
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + Math.round(tx.amount * 100));
    byCategory.set(tx.category, monthMap);
  }

  const stats = new Map<string, CategorySpendStats>();
  const avgKeys = monthKeys.slice(-avgMonths);

  for (const [category, monthMap] of byCategory) {
    const sparkline = monthKeys.map((key) => monthMap.get(key) ?? 0);
    const avgTotal = avgKeys.reduce((sum, key) => sum + (monthMap.get(key) ?? 0), 0);
    stats.set(category, {
      avgCents: Math.round(avgTotal / avgMonths),
      sparkline,
    });
  }

  return stats;
}
