import { useCapabilities } from '@/hooks/use-capabilities'
import { CapabilityNotice } from '@/components/capability-notice'
import { useTranslation } from 'react-i18next'
import { GoogleCalendarIntegration } from '@/components/settings/google-calendar-integration'
import { LineIntegration } from '@/components/settings/line-integration'

export function IntegrationsPanel() {
  const capabilities = useCapabilities()
  const { t } = useTranslation('settings')
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground pb-1">
        {t('integrations.description')}
      </p>
      <div className="space-y-2">
        <GoogleCalendarIntegration />
        <CapabilityNotice available={capabilities.data?.googleCalendar} unavailableKey="googleCalendarUnavailable" />
      </div>
      <div className="space-y-2">
        <LineIntegration />
        <CapabilityNotice available={capabilities.data?.line} unavailableKey="lineUnavailable" />
      </div>
    </div>
  )
}
