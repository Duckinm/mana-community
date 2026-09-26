import { RECURRING_INTERVAL_KEYS } from '@/components/documents/constants'
import type { Document } from '@/components/documents/types'
import { Repeat } from '@/components/icons'
import { useTranslation } from 'react-i18next'

export function DocumentRecurringBadge({
  interval,
  compact = false,
}: {
  interval: NonNullable<Document['recurringInterval']>
  compact?: boolean
}) {
  const { t } = useTranslation('documents')
  return (
    <span
      className="inline-flex w-fit max-w-full shrink-0 items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap"
      style={{ color: 'var(--category-purple)', background: 'var(--category-purple-soft)' }}
    >
      <Repeat size={compact ? 10 : 11} />
      {t(RECURRING_INTERVAL_KEYS[interval])}
    </span>
  )
}
