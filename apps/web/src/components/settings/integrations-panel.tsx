import { useTranslation } from 'react-i18next'
import { GoogleCalendarIntegration } from '@/components/settings/google-calendar-integration'
import { LineIntegration } from '@/components/settings/line-integration'

export function IntegrationsPanel() {
  const { t } = useTranslation('settings')
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground pb-1">
        {t('integrations.description')}
      </p>
      <GoogleCalendarIntegration />
      <LineIntegration />
    </div>
  )
}
