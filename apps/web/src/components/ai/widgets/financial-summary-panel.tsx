import { useTranslation } from 'react-i18next'
import { Wallet } from '@/components/icons'
import { AiWidgetShell } from '@/components/ai/widgets/widget-shell'

export type FinancialSummaryData = {
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  monthlyAvgRevenue: number
  monthlyAvgExpenses: number
  runwayMonths: number | null
}

function formatMoney(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function FinancialSummaryAiPanel({ summary }: { summary: FinancialSummaryData }) {
  const { t } = useTranslation('chat')

  return (
    <AiWidgetShell icon={<Wallet size={12} />} label={t('widget.financialSummary')}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-2xs text-caption">{t('widget.revenue')}</p>
          <p className="text-sm font-medium font-mono tabular-nums text-foreground">{formatMoney(summary.totalRevenue)}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.expenses')}</p>
          <p className="text-sm font-medium font-mono tabular-nums text-foreground">{formatMoney(summary.totalExpenses)}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.netIncome')}</p>
          <p className={`text-sm font-medium font-mono tabular-nums ${summary.netIncome >= 0 ? 'text-teal' : 'text-red-400'}`}>
            {formatMoney(summary.netIncome)}
          </p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.runway')}</p>
          <p className="text-sm font-medium text-foreground">
            {summary.runwayMonths !== null ? t('widget.runwayMonths', { months: summary.runwayMonths }) : '—'}
          </p>
        </div>
      </div>
    </AiWidgetShell>
  )
}
