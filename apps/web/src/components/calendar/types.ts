import type {
  ApiCalendarEvent,
  ApiCalendarEventCreateBody,
  ApiCalendarEventPatchBody,
  ApiCalendarOverlay,
} from '@/lib/api-types'

export type { RecurrenceMutationOptions } from '@/lib/api-types'

export type CalendarEvent = ApiCalendarEvent
export type CalendarEventInput = ApiCalendarEventCreateBody
export type CalendarOverlay = ApiCalendarOverlay
export type CalendarDateRange = { start: string; end: string }

export type CalendarEventPatchInput = ApiCalendarEventPatchBody
