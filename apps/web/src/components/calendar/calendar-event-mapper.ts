import { addCalendarDays, toCalendarDateString } from '@/lib/calendar-date'

function allDayDurationDays(startDate: string, endDate: string | null): number {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${(endDate ?? startDate)}T00:00:00`)
  return Math.max(Math.round((end.getTime() - start.getTime()) / 86400000) + 1, 1)
}

function timedDuration(event: { startAt: string | null; endAt: string | null }): string {
  const start = event.startAt ? new Date(event.startAt).getTime() : 0
  const end = event.endAt ? new Date(event.endAt).getTime() : start + 3600000
  const minutes = Math.max(Math.round((end - start) / 60000), 30)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function calendarEventToFullCalendar(
  event: {
    id: string
    title: string
    allDay: boolean
    startDate: string | null
    endDate: string | null
    startAt: string | null
    endAt: string | null
    rrule?: string | null
    exdates?: string[]
    recurringEventId?: string | null
    source?: string
    accountEmail?: string | null
  },
  accountColorVar?: string,
) {
  const isGoogle = event.source === 'google'
  // Colour says which calendar the event lives on, not where it was typed — an event
  // created here on a linked calendar is on Google too, and looks it. Only dragging
  // still depends on origin, since Google's own copies are read-only here.
  const onGoogleCalendar = isGoogle || !!event.accountEmail
  const classNames = [onGoogleCalendar ? 'calendar-event-google' : 'calendar-event-native']
  const accountColorProps =
    event.accountEmail && accountColorVar
      ? {
          backgroundColor: `color-mix(in srgb, var(${accountColorVar}) 18%, var(--surface-raised))`,
          borderColor: `color-mix(in srgb, var(${accountColorVar}) 45%, var(--border-subtle))`,
          textColor: `var(${accountColorVar})`,
        }
      : {}
  const sharedProps = {
    editable: !isGoogle,
    ...accountColorProps,
    extendedProps: {
      masterId: event.id,
      source: event.source ?? 'native',
      recurring: false as boolean,
    },
  }

  if (event.rrule && !event.recurringEventId && event.allDay && event.startDate) {
    return {
      id: event.id,
      groupId: event.id,
      title: event.title,
      allDay: true,
      start: event.startDate,
      rrule: event.rrule,
      exdate: event.exdates ?? [],
      duration: { days: allDayDurationDays(event.startDate, event.endDate) },
      classNames,
      ...sharedProps,
      extendedProps: { ...sharedProps.extendedProps, masterId: event.id, recurring: true },
    }
  }

  if (event.rrule && !event.recurringEventId && event.startAt) {
    return {
      id: event.id,
      groupId: event.id,
      title: event.title,
      start: event.startAt,
      rrule: event.rrule,
      exdate: event.exdates ?? [],
      duration: timedDuration(event),
      classNames,
      ...sharedProps,
      extendedProps: { ...sharedProps.extendedProps, masterId: event.id, recurring: true },
    }
  }

  if (event.allDay && event.startDate) {
    const exclusiveEnd = event.endDate
      ? addCalendarDays(event.endDate, 1)
      : addCalendarDays(event.startDate, 1)
    return {
      id: event.id,
      title: event.title,
      allDay: true,
      start: event.startDate,
      end: exclusiveEnd,
      classNames,
      ...sharedProps,
      extendedProps: {
        ...sharedProps.extendedProps,
        masterId: event.recurringEventId ?? event.id,
        recurring: !!event.recurringEventId,
      },
    }
  }

  return {
    id: event.id,
    title: event.title,
    allDay: false,
    start: event.startAt ?? undefined,
    end: event.endAt ?? undefined,
    classNames,
    ...sharedProps,
    extendedProps: {
      ...sharedProps.extendedProps,
      masterId: event.recurringEventId ?? event.id,
      recurring: !!event.recurringEventId,
    },
  }
}

export function overlayToFullCalendar(overlay: {
  id: string
  title: string
  date: string
  kind: 'milestone' | 'document'
  projectId: string | null
  documentId: string | null
  documentType: string | null
  documentStatus: 'published' | 'overdue' | null
  documentDateKind: 'invoiceDue' | 'quoteExpiry' | 'recurringGeneration' | null
  urgency: 'normal' | 'dueSoon' | 'overdue' | 'expired' | null
}) {
  const documentToneClass =
    overlay.documentDateKind === 'recurringGeneration'
      ? 'calendar-overlay-document-recurring'
      : overlay.urgency === 'overdue' || overlay.urgency === 'expired'
        ? 'calendar-overlay-document-critical'
        : overlay.urgency === 'dueSoon'
          ? 'calendar-overlay-document-soon'
          : null

  return {
    id: overlay.id,
    title: overlay.title,
    allDay: true,
    start: overlay.date,
    end: addCalendarDays(overlay.date, 1),
    editable: false,
    display: 'block',
    classNames:
      overlay.kind === 'milestone'
        ? ['calendar-overlay-milestone']
        : ['calendar-overlay-document', documentToneClass].filter((value): value is string => !!value),
    extendedProps: { ...overlay, itemKind: overlay.kind },
  }
}

export function taskToFullCalendar(task: {
  id: string
  title: string
  projectId: string
  date: string
  time?: string | null
  scheduledStart?: string | null
  scheduledEnd?: string | null
}) {
  if (task.scheduledStart && task.scheduledEnd) {
    return {
      id: `task-${task.id}`,
      title: task.title,
      allDay: false,
      start: new Date(task.scheduledStart),
      end: new Date(task.scheduledEnd),
      editable: true,
      durationEditable: true,
      classNames: ['calendar-overlay-task'],
      extendedProps: { kind: 'task', taskId: task.id, projectId: task.projectId, scheduled: true },
    }
  }

  if (task.time) {
    const start = new Date(`${task.date}T${task.time}:00`)
    const end = new Date(start.getTime() + 30 * 60 * 1000)
    return {
      id: `task-${task.id}`,
      title: task.title,
      allDay: false,
      start,
      end,
      editable: true,
      durationEditable: true,
      classNames: ['calendar-overlay-task'],
      extendedProps: { kind: 'task', taskId: task.id, projectId: task.projectId },
    }
  }

  return {
    id: `task-${task.id}`,
    title: task.title,
    allDay: true,
    start: task.date,
    end: addCalendarDays(task.date, 1),
    editable: true,
    durationEditable: false,
    classNames: ['calendar-overlay-task'],
    extendedProps: { kind: 'task', taskId: task.id, projectId: task.projectId },
  }
}

export function fullCalendarSelectionToInput(selection: {
  start: Date
  end: Date
  allDay: boolean
}): {
  allDay: boolean
  startDate: string | null
  endDate: string | null
  startAt: string | null
  endAt: string | null
} {
  if (selection.allDay) {
    const startDate = toCalendarDateString(selection.start)
    const endInclusive = addCalendarDays(toCalendarDateString(selection.end), -1)
    return {
      allDay: true,
      startDate,
      endDate: endInclusive,
      startAt: null,
      endAt: null,
    }
  }

  return {
    allDay: false,
    startDate: null,
    endDate: null,
    startAt: selection.start.toISOString(),
    endAt: selection.end.toISOString(),
  }
}

export function fullCalendarDropToPatch(info: {
  event: { start: Date | null; end: Date | null; allDay: boolean }
}): Partial<{
  allDay: boolean
  startDate: string | null
  endDate: string | null
  startAt: string | null
  endAt: string | null
}> {
  const { start, end, allDay } = info.event
  if (!start) return {}

  if (allDay) {
    if (!end) return {}
    const startDate = toCalendarDateString(start)
    const endInclusive = addCalendarDays(toCalendarDateString(end), -1)
    return {
      allDay: true,
      startDate,
      endDate: endInclusive,
      startAt: null,
      endAt: null,
    }
  }

  const timedEnd = end ?? new Date(start.getTime() + 3600000)
  return {
    allDay: false,
    startDate: null,
    endDate: null,
    startAt: start.toISOString(),
    endAt: timedEnd.toISOString(),
  }
}

export function instanceStartFromEvent(event: {
  allDay: boolean
  start: Date | null
}): string | null {
  if (!event.start) return null
  return event.allDay ? toCalendarDateString(event.start) : event.start.toISOString()
}
