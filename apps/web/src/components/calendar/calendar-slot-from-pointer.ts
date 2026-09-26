import type { CalendarEventInput } from '@/components/calendar/types'

function timedDefaults(date: string, time: string): Partial<CalendarEventInput> {
  const startAt = new Date(`${date}T${time}`)
  const endAt = new Date(startAt.getTime() + 30 * 60 * 1000)
  return {
    allDay: false,
    startDate: null,
    endDate: null,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  }
}

function allDayDefaults(date: string): Partial<CalendarEventInput> {
  return {
    allDay: true,
    startDate: date,
    endDate: date,
    startAt: null,
    endAt: null,
  }
}

export function calendarDefaultsFromPointer(target: EventTarget | null): Partial<CalendarEventInput> | null {
  if (!(target instanceof Element)) return null
  if (target.closest('.fc-header-toolbar, .fc-event, .fc-popover')) return null

  const dayCell = target.closest('.fc-daygrid-day[data-date]')
  if (dayCell instanceof HTMLElement && dayCell.dataset.date) {
    return allDayDefaults(dayCell.dataset.date)
  }

  const timeCol = target.closest('.fc-timegrid-col[data-date]')
  const timeSlot = target.closest('.fc-timegrid-slot[data-time]')
  if (
    timeCol instanceof HTMLElement &&
    timeSlot instanceof HTMLElement &&
    timeCol.dataset.date &&
    timeSlot.dataset.time
  ) {
    return timedDefaults(timeCol.dataset.date, timeSlot.dataset.time)
  }

  const listDay = target.closest('.fc-list-day[data-date]')
  if (listDay instanceof HTMLElement && listDay.dataset.date) {
    return allDayDefaults(listDay.dataset.date)
  }

  return null
}
