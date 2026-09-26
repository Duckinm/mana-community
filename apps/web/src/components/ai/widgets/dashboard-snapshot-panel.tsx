import { useTranslation } from 'react-i18next'
import { LayoutGrid } from '@/components/icons'
import { AiWidgetShell } from '@/components/ai/widgets/widget-shell'

export type DashboardSnapshotData = {
  activeProjects: number
  openTasks: number
  overdueTasks: number
  thisMonthRevenue: number
  thisMonthExpenses: number
  thisMonthNet: number
  totalFiles: number
  baseCurrency?: string
}

function formatMoney(amount: number, currency = 'THB') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function DashboardSnapshotAiPanel({ snapshot }: { snapshot: DashboardSnapshotData }) {
  const { t } = useTranslation('chat')
  const currency = snapshot.baseCurrency ?? 'THB'

  return (
    <AiWidgetShell icon={<LayoutGrid size={12} />} label={t('widget.dashboardSnapshot')}>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xs text-caption">{t('widget.activeProjects')}</p>
          <p className="text-sm font-medium text-foreground">{snapshot.activeProjects}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.tasksOpen')}</p>
          <p className="text-sm font-medium text-foreground">{snapshot.openTasks}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.overdueTasks')}</p>
          <p className={`text-sm font-medium ${snapshot.overdueTasks > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {snapshot.overdueTasks}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
        <div>
          <p className="text-2xs text-caption">{t('widget.monthRevenue')}</p>
          <p className="text-sm font-medium font-mono tabular-nums text-teal">{formatMoney(snapshot.thisMonthRevenue, currency)}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.monthExpenses')}</p>
          <p className="text-sm font-medium font-mono tabular-nums text-foreground">{formatMoney(snapshot.thisMonthExpenses, currency)}</p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.monthNet')}</p>
          <p className={`text-sm font-medium font-mono tabular-nums ${snapshot.thisMonthNet >= 0 ? 'text-teal' : 'text-red-400'}`}>
            {formatMoney(snapshot.thisMonthNet, currency)}
          </p>
        </div>
        <div>
          <p className="text-2xs text-caption">{t('widget.files')}</p>
          <p className="text-sm font-medium text-foreground">{snapshot.totalFiles}</p>
        </div>
      </div>
    </AiWidgetShell>
  )
}
