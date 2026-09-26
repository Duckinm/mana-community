import { parseTimestamp } from '@/lib/timestamp'
import type { CalendarEvent } from '@/components/calendar/types'

export type DayBusyBlock = {
  id: string
  title: string
  startMinutes: number
  endMinutes: number
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m)
}

/** Existing events (excluding the one being edited) that touch the given calendar day, as minute ranges. */
export function dayBusyBlocks(
  events: CalendarEvent[],
  day: string,
  excludeId?: string | null,
): DayBusyBlock[] {
  const blocks: DayBusyBlock[] = []
  for (const event of events) {
    if (event.allDay || event.id === excludeId) continue
    const start = parseTimestamp(event.startAt)
    const end = parseTimestamp(event.endAt)
    if (!start || !end) continue
    const startDay = localDayString(start)
    const endDay = localDayString(end)
    if (day < startDay || day > endDay) continue
    const startMinutes = day > startDay ? 0 : start.getHours() * 60 + start.getMinutes()
    const endMinutes = day < endDay ? 24 * 60 : end.getHours() * 60 + end.getMinutes()
    if (endMinutes <= startMinutes) continue
    blocks.push({ id: event.id, title: event.title, startMinutes, endMinutes })
  }
  return blocks.sort((a, b) => a.startMinutes - b.startMinutes)
}

function localDayString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** First busy block that a [start, end) range overlaps, with the overlap size in minutes. */
export function findConflict(
  busy: DayBusyBlock[],
  startMinutes: number,
  endMinutes: number,
): { block: DayBusyBlock; overlapMinutes: number } | null {
  for (const block of busy) {
    const overlap = Math.min(endMinutes, block.endMinutes) - Math.max(startMinutes, block.startMinutes)
    if (overlap > 0) return { block, overlapMinutes: overlap }
  }
  return null
}
