import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalendarEvent } from '@/components/calendar/types'
import {
  dayBusyBlocks,
  findConflict,
  timeToMinutes,
} from '@/components/calendar/event-time-slots'

type TimeConflictNoticeProps = {
  day: string
  events: CalendarEvent[]
  excludeId?: string | null
  startTime: string
  endTime: string
}

export function TimeConflictNotice({
  day,
  events,
  excludeId,
  startTime,
  endTime,
}: TimeConflictNoticeProps) {
  const { t } = useTranslation('calendar')

  const busy = useMemo(
    () => dayBusyBlocks(events, day, excludeId),
    [events, day, excludeId],
  )

  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  const conflict = useMemo(
    () => (endMinutes > startMinutes ? findConflict(busy, startMinutes, endMinutes) : null),
    [busy, startMinutes, endMinutes],
  )

  if (!conflict) return null

  return (
    <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
      {t('form.conflictWarning', {
        title: conflict.block.title,
        minutes: conflict.overlapMinutes,
      })}
    </p>
  )
}
