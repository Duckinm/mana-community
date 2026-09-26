import { addCalendarDays, parseCalendarDate } from '@/lib/calendar-date'

export function calendarSpanDays(start: string, end: string): number {
  const from = parseCalendarDate(start)
  const to = parseCalendarDate(end)
  if (!from || !to) return 0
  return Math.max(Math.round((to.getTime() - from.getTime()) / 86400000), 0)
}

/** Moving the start past the end drags the end along instead of inverting the range. */
export function endDateForStart(prevStart: string, end: string, nextStart: string): string {
  if (!end || end >= nextStart) return end
  return addCalendarDays(nextStart, calendarSpanDays(prevStart, end))
}

/** The end can never land before the start. */
export function clampEndDate(start: string, end: string): string {
  return start && end < start ? start : end
}
