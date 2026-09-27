import { UsageHeatmap } from '@/components/settings/usage-heatmap'
import { useTranslation } from 'react-i18next'

export function UsagePanel() {
  const { t } = useTranslation('settings')
  return (
    <div>
      <div className="surface-card mb-3 rounded-xl p-4">
        <p className="text-sm font-semibold text-foreground">{t('billing.selfHostedTitle')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('billing.selfHostedDescription')}</p>
      </div>
      <UsageHeatmap />
    </div>
  )
}
