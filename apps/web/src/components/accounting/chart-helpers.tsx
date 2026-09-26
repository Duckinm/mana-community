import type { ComponentType, CSSProperties, ReactNode } from "react";

/**
 * Shared axis/legend chrome for all recharts usage — 12px is the readability
 * floor for chart text (see .claude/skills/design-tokens/SKILL.md type scale).
 * Centralised here so no chart can quietly regress to a smaller size.
 */
export const CHART_TICK_STYLE = { fontSize: 12, fill: "var(--text-muted)" } as const;
export const CHART_LEGEND_STYLE = { fontSize: 12, color: "var(--text-muted)" } as const;
export const CHART_LABEL_STYLE = {
  fontSize: 12,
  fill: "var(--text-muted)",
  fontWeight: 500,
} as const;

interface ChartCardHeaderProps {
  icon: ComponentType<{ size?: number; strokeWidth?: number; style?: CSSProperties }>;
  label: string;
  color: string;
  bg: string;
  right?: ReactNode;
}

export function ChartCardHeader({ icon: Icon, label, color, bg, right }: ChartCardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <Icon size={13} strokeWidth={2} style={{ color }} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      </div>
      {right}
    </div>
  );
}

export function formatMonthKey(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString(locale, { month: "short" });
}

export function formatAmount(cents: number, currency = "USD"): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** Axis/tooltip formatter bound to the account's base currency. */
export function amountFormatter(currency = "USD") {
  return (cents: number) => formatAmount(cents, currency);
}

export const CATEGORY_COLORS = [
  "var(--primary)",
  "var(--category-orange)",
  "var(--category-purple)",
  "var(--category-green)",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
];

interface TooltipPayload {
  name: string;
  value: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  valueFormatter?: (value: number) => string;
}

export function CustomTooltip({ active, payload, label, valueFormatter = formatAmount }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-border-subtle shadow-popup px-3 py-2 text-xs"
      style={{ background: "var(--surface-raised)" }}
    >
      {label && (
        <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      )}
      {payload.map((entry) => (
        <p key={entry.name} className="font-semibold" style={{ color: entry.color }}>
          {entry.name}: {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  );
}
