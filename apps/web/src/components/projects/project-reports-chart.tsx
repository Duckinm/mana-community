import { CHART_LEGEND_STYLE, CHART_TICK_STYLE, CustomTooltip, formatAmount } from '@/components/accounting/chart-helpers'
import type { CashflowChartPoint } from '@/components/projects/project-billing-helpers'
import { TrendingUp } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SERIES = [
  { key: 'idealSell' as const, color: 'var(--primary)' },
  { key: 'idealPurchase' as const, color: 'var(--category-orange)' },
  { key: 'current' as const, color: 'var(--category-green)' },
]

export function ProjectReportsChart({ data }: { data: CashflowChartPoint[] }) {
  const { t } = useTranslation('projects')
  const hasData = data.some(
    (point) => point.idealSell > 0 || point.idealPurchase > 0 || point.current > 0,
  )

  if (!hasData) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-raised/40 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-foreground">
          <TrendingUp size={15} strokeWidth={2} />
        </span>
        <p className="text-sm text-muted-foreground">
          {t('chart.noData')}
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={CHART_TICK_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={CHART_TICK_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatAmount(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ ...CHART_LEGEND_STYLE, paddingTop: 12 }}
          formatter={(value) => <span className="text-muted-foreground">{value}</span>}
        />
        {SERIES.map(({ key, color }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={t(`chart.${key}`)}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
