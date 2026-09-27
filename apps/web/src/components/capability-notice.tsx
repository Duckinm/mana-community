import { useTranslation } from 'react-i18next'
import { useCapabilities } from '@/hooks/use-capabilities'

export function CapabilityNotice({ available, unavailableKey }: { available: boolean | undefined; unavailableKey: string }) {
  const { t } = useTranslation('capabilities')
  const query = useCapabilities()
  if (query.isError) {
    return <p role="status" className="my-2 rounded-lg border border-border-subtle bg-surface-raised p-3 text-sm text-foreground">{t('loadFailed')} {' '}
      <button type="button" onClick={() => void query.refetch()} className="underline hover:text-foreground">{t('retry')}</button>
    </p>
  }
  if (query.isPending) return <p role="status" className="my-2 rounded-lg border border-border-subtle bg-surface-raised p-3 text-sm text-foreground">{t('loading')}</p>
  if (available) return null
  return <p role="status" className="my-2 rounded-lg border border-border-subtle bg-surface-raised p-3 text-sm text-foreground">{t(unavailableKey)}</p>
}

export function EmailCapabilityNotice() {
  const { t } = useTranslation('capabilities')
  const query = useCapabilities()
  return <>
    <CapabilityNotice available={query.data ? query.data.email !== 'disabled' : undefined} unavailableKey="emailUnavailable" />
    {query.data?.email === 'local' && !query.isError && <p role="status" className="my-2 rounded-lg border border-border-subtle bg-surface-raised p-3 text-sm text-foreground">{t('localEmail')}</p>}
  </>
}
