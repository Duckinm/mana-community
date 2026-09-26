import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { IntegrationsPanel } from '@/components/settings/integrations-panel'
import { IntegrationsPanelSkeleton } from '@/components/settings/integrations-panel-skeleton'
import { useCalendarConnection } from '@/hooks/use-calendar-connection'
import { useLineConnection } from '@/hooks/use-line-connection'

const KNOWN_LINK_ERRORS = ['account_already_linked_to_different_user'] as const

export const Route = createFileRoute('/_app/settings/integrations')({
  validateSearch: z.object({ error: z.string().optional() }),
  component: IntegrationsRoute,
})

function IntegrationsRoute() {
  const { error } = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useTranslation('settings')
  const { isLoading } = useCalendarConnection()
  const { isLoading: lineIsLoading } = useLineConnection()

  useEffect(() => {
    if (!error) return
    const key = (KNOWN_LINK_ERRORS as readonly string[]).includes(error)
      ? `integrations.linkErrors.${error}`
      : 'integrations.linkErrors.generic'
    // Defer a tick: on a fresh page load this child effect runs before the root
    // Toaster subscribes, and sonner drops toasts fired before subscription.
    setTimeout(() => {
      toast.error(t(key), { duration: 10_000 })
      void navigate({ to: '/settings/integrations', search: {}, replace: true })
    }, 0)
  }, [error, navigate, t])

  if (isLoading || lineIsLoading) return <IntegrationsPanelSkeleton />
  return <IntegrationsPanel />
}
