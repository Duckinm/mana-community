// Thailand has had a fixed +07:00 offset since 1920 and observes no DST, so the base
// hour can be pinned with a literal offset instead of a tz database lookup.
const BANGKOK_OFFSET = '+07:00'
const BASE_HOUR = 9
const JITTER_MINUTES = 40
const STAGGER_MINUTES = 15
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

/** The YYYY-MM-DD an instant falls on in Bangkok — the calendar the CMS reports in. */
export function bangkokCalendarDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** Midnight Bangkok that starts the given calendar date. */
export function bangkokDayStart(date: string): Date {
  return new Date(`${date}T00:00:00${BANGKOK_OFFSET}`)
}

function baseHourAt(date: string): Date {
  return new Date(`${date}T${String(BASE_HOUR).padStart(2, '0')}:00:00${BANGKOK_OFFSET}`)
}

/**
 * Publish Window slots: the next future 09:00 Asia/Bangkok shifted by a shared daily jitter
 * of ±40 minutes, then staggered 0–15 minutes per piece so a batch never shares a timestamp.
 */
export function nextPublishSlots(now: Date, count: number, random: () => number = Math.random): Date[] {
  const jitterMs = Math.round((random() * 2 - 1) * JITTER_MINUTES) * MINUTE_MS
  let base = baseHourAt(bangkokCalendarDate(now)).getTime() + jitterMs
  if (base <= now.getTime()) {
    base = baseHourAt(bangkokCalendarDate(new Date(now.getTime() + DAY_MS))).getTime() + jitterMs
  }

  const slots: Date[] = []
  let previous = 0
  for (let piece = 0; piece < count; piece++) {
    const staggered = base + Math.round(random() * STAGGER_MINUTES) * MINUTE_MS
    const slot = Math.max(staggered, previous + MINUTE_MS)
    slots.push(new Date(slot))
    previous = slot
  }
  return slots
}

export function nextPublishSlot(now: Date, random: () => number = Math.random): Date {
  return nextPublishSlots(now, 1, random)[0]
}
