import { createFileRoute, stripSearchParams, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { BillingPanel } from '@/components/settings/billing-panel'
import { BillingPanelSkeleton } from '@/components/settings/billing-panel-skeleton'
import { useSettings } from '@/context/settings'
import { client, expectEden } from '@/lib/eden'
import { queryKeys } from '@/lib/query-keys'

const billingSearchSchema = z.object({
  success: z.boolean().catch(false),
  canceled: z.boolean().catch(false),
  sessionId: z.string().optional(),
})

const searchDefaults = {
  success: false,
  canceled: false,
  sessionId: undefined,
}

export const Route = createFileRoute('/_app/settings/billing')({
  validateSearch: billingSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: BillingRoute,
})

function BillingRoute() {
  const { t } = useTranslation('settings')
  const { success, canceled, sessionId } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { loading } = useSettings()

  useEffect(() => {
    if (success) {
      void (async () => {
        try {
          const result = sessionId
            ? expectEden(
                await client.api.billing['checkout-status'].get({
                  query: { sessionId },
                }),
              )
            : null
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.user }),
            queryClient.invalidateQueries({ queryKey: ['billing', 'overview'] }),
          ])
          toast.success(
            result?.complete
              ? t('billing.checkoutSuccess')
              : t('billing.checkoutProcessing'),
          )
        } catch {
          toast(t('billing.checkoutProcessing'))
        }
        navigate({
          search: { success: false, canceled: false, sessionId: undefined },
          replace: true,
        })
      })()
    } else if (canceled) {
      toast(t('billing.checkoutCanceled'))
      navigate({
        search: { success: false, canceled: false, sessionId: undefined },
        replace: true,
      })
    }
  }, [success, canceled, sessionId])

  if (loading) return <BillingPanelSkeleton />
  return <BillingPanel />
}
