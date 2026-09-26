import type { EventContentArg } from '@fullcalendar/core'
import { formatTimestampTime } from '@/lib/timestamp'

export function formatCalendarEventTime(start: Date | null): string {
  return formatTimestampTime(start, '')
}

export function calendarEventContent(arg: EventContentArg): { domNodes: Node[] } | true {
  if (!arg.view.type.startsWith('dayGrid') || arg.event.allDay) {
    return true
  }

  const row = document.createElement('div')
  row.className = 'calendar-event-row'

  const title = document.createElement('span')
  title.className = 'calendar-event-row-title'
  title.textContent = arg.event.title

  const time = document.createElement('span')
  time.className = 'calendar-event-row-time'
  time.textContent = formatCalendarEventTime(arg.event.start)

  row.appendChild(title)
  row.appendChild(time)

  return { domNodes: [row] }
}
