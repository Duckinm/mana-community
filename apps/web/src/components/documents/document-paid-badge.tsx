import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCalendarDate } from '@/lib/calendar-date'
import { CheckCircle2, Circle } from '@/components/icons'

export function DocumentPaidBadge({ paidAt }: { paidAt: string | null }) {
  const { t } = useTranslation('documents')
  if (paidAt) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex w-fit shrink-0 cursor-default items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap text-success bg-success-soft border border-success-border"
          >
            <CheckCircle2 size={11} />
            {t('paidBadge.paid')}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {t('paidBadge.paymentReceived', { date: formatCalendarDate(paidAt) })}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-fit shrink-0 cursor-default items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap text-ink-muted bg-surface-raised border border-border-default">
          <Circle size={11} />
          {t('paidBadge.unpaid')}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {t('paidBadge.noPaymentLinked')}
      </TooltipContent>
    </Tooltip>
  )
}
