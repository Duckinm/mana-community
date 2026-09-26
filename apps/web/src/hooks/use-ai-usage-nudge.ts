import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { client, expectEden } from '@/lib/eden'
import { useSettings } from '@/context/settings'
import { ACTION_CAPS } from '@mana/db/plan-entitlements'

const NUDGE_THRESHOLD = 0.8

/** Non-blocking upsell toast for free-plan users approaching their monthly AI Action cap. */
export function useAiUsageNudge() {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const { user } = useSettings()
  const isFree = user?.deploymentMode !== 'self-hosted' && (!user || user.plan === 'free')
  const notifiedRef = useRef(false)

  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: async () => expectEden(await client.api.billing.usage.get()),
    enabled: isFree,
    refetchInterval: isFree ? 60_000 : false,
  })

  useEffect(() => {
    if (!isFree || !usage) return
    const { used, cap } = usage.ai
    const percent = cap > 0 ? used / cap : 0
    if (percent >= NUDGE_THRESHOLD && percent < 1 && !notifiedRef.current) {
      notifiedRef.current = true
      toast.info(t('usageNudge.title'), {
        description: t('usageNudge.description', {
          used,
          cap,
          manaCap: ACTION_CAPS.mana,
        }),
        action: {
          label: t('usageNudge.upgrade'),
          onClick: () => navigate({ to: '/settings/billing', search: { success: false, canceled: false } }),
        },
      })
    }
    if (percent < NUDGE_THRESHOLD) notifiedRef.current = false
  }, [isFree, usage, t, navigate])
}
