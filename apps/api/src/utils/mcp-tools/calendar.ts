import {
  getCalendarConnection,
  listGoogleCalendars,
  removeGoogleCalendarConnection,
  selectGoogleCalendar,
} from '@api/modules/calendar/connection'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  listCalendarOverlays,
  patchCalendarEvent,
} from '@api/modules/calendar/service'
import { syncGoogleCalendarInbound } from '@api/modules/calendar/sync'
import { ValidationError } from '@api/lib/errors'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

type CreateEventInput = Parameters<typeof createCalendarEvent>[1]
type UpdateEventInput = Parameters<typeof patchCalendarEvent>[2]

const MAX_LIST_LIMIT = 100
const DEFAULT_LIST_LIMIT = 50

function requiredString(args: Record<string, unknown>, name: string) {
  const value = args[name]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`)
  return value
}

function optionalString(args: Record<string, unknown>, name: string) {
  const value = args[name]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${name} must be a string`)
  return value
}

function optionalNullableString(args: Record<string, unknown>, name: string) {
  const value = args[name]
  if (value === undefined || value === null) return value
  if (typeof value !== 'string') throw new Error(`${name} must be a string or null`)
  return value
}

function optionalBoolean(args: Record<string, unknown>, name: string) {
  const value = args[name]
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`)
  return value
}

function optionalAlertMinutes(args: Record<string, unknown>) {
  const value = args.alertMinutes
  if (value === undefined || value === null) return value
  if (!Array.isArray(value) || value.some((minute) => !Number.isInteger(minute))) {
    throw new Error('alertMinutes must be an array of whole minutes or null')
  }
  return value
}

function listRange(args: Record<string, unknown>) {
  return {
    start: requiredString(args, 'start'),
    end: requiredString(args, 'end'),
  }
}

function listLimit(args: Record<string, unknown>) {
  const value = args.limit
  if (value === undefined) return DEFAULT_LIST_LIMIT
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_LIST_LIMIT) {
    throw new Error(`limit must be a whole number from 1 to ${MAX_LIST_LIMIT}`)
  }
  return value
}

function createEventInput(args: Record<string, unknown>, context?: ToolContext): CreateEventInput {
  const allDay = args.allDay
  if (typeof allDay !== 'boolean') throw new Error('allDay is required')

  const input: CreateEventInput = {
    title: requiredString(args, 'title'),
    allDay,
  }
  const startDate = optionalNullableString(args, 'startDate')
  if (startDate !== undefined) input.startDate = startDate
  const endDate = optionalNullableString(args, 'endDate')
  if (endDate !== undefined) input.endDate = endDate
  const startAt = optionalNullableString(args, 'startAt')
  if (startAt !== undefined) input.startAt = startAt
  const endAt = optionalNullableString(args, 'endAt')
  if (endAt !== undefined) input.endAt = endAt
  const timeZone = optionalString(args, 'timeZone')
  if (timeZone !== undefined) input.timeZone = timeZone
  const rrule = optionalNullableString(args, 'rrule')
  if (rrule !== undefined) input.rrule = rrule
  const contactId = optionalNullableString(args, 'contactId')
  if (contactId !== undefined) input.contactId = contactId
  const note = optionalNullableString(args, 'note')
  if (note !== undefined) input.note = note
  const location = optionalNullableString(args, 'location')
  if (location !== undefined) input.location = location
  const calendarConnectionId = optionalNullableString(args, 'calendarConnectionId')
  if (calendarConnectionId !== undefined) input.calendarConnectionId = calendarConnectionId
  const alertMinutes = optionalAlertMinutes(args)
  if (alertMinutes !== undefined) input.alertMinutes = alertMinutes
  const syncToGoogle = optionalBoolean(args, 'syncToGoogle')
  if (context?.source === 'external-mcp') {
    input.syncToGoogle = syncToGoogle === true
  } else if (syncToGoogle !== undefined) {
    input.syncToGoogle = syncToGoogle
  }
  return input
}

function requireGoogleSyncConfirmation(args: Record<string, unknown>, context?: ToolContext) {
  if (context?.source === 'external-mcp' && args.confirmGoogleSync !== true) {
    throw new ValidationError('confirmGoogleSync must be true after the user confirms the Google Calendar change')
  }
}

function updateEventInput(args: Record<string, unknown>): UpdateEventInput {
  const input: UpdateEventInput = {}
  const title = optionalString(args, 'title')
  if (title !== undefined) input.title = title
  const allDay = optionalBoolean(args, 'allDay')
  if (allDay !== undefined) input.allDay = allDay
  const startDate = optionalNullableString(args, 'startDate')
  if (startDate !== undefined) input.startDate = startDate
  const endDate = optionalNullableString(args, 'endDate')
  if (endDate !== undefined) input.endDate = endDate
  const startAt = optionalNullableString(args, 'startAt')
  if (startAt !== undefined) input.startAt = startAt
  const endAt = optionalNullableString(args, 'endAt')
  if (endAt !== undefined) input.endAt = endAt
  const timeZone = optionalString(args, 'timeZone')
  if (timeZone !== undefined) input.timeZone = timeZone
  const rrule = optionalNullableString(args, 'rrule')
  if (rrule !== undefined) input.rrule = rrule
  const contactId = optionalNullableString(args, 'contactId')
  if (contactId !== undefined) input.contactId = contactId
  const note = optionalNullableString(args, 'note')
  if (note !== undefined) input.note = note
  const location = optionalNullableString(args, 'location')
  if (location !== undefined) input.location = location
  const alertMinutes = optionalAlertMinutes(args)
  if (alertMinutes !== undefined) input.alertMinutes = alertMinutes
  return input
}

function recurrenceScope(args: Record<string, unknown>): 'single' | 'following' | 'all' | undefined {
  const scope = args.scope
  if (scope === undefined) return undefined
  if (scope !== 'single' && scope !== 'following' && scope !== 'all') {
    throw new Error('scope must be single, following, or all')
  }
  return scope
}

function mutationScope(args: Record<string, unknown>) {
  const scope = recurrenceScope(args)
  const instanceStart = optionalString(args, 'instanceStart')
  if ((scope === 'single' || scope === 'following') && !instanceStart) {
    throw new Error('instanceStart is required when scope is single or following')
  }
  return { scope, instanceStart }
}

async function selectCalendar(userId: string, args: Record<string, unknown>, context?: ToolContext) {
  requireGoogleSyncConfirmation(args, context)
  const result = await selectGoogleCalendar(
    userId,
    requiredString(args, 'accountId'),
    requiredString(args, 'calendarId'),
    requiredString(args, 'calendarName'),
    optionalString(args, 'accountEmail'),
  )
  if (!result.ok) {
    if (result.reason === 'not_connected') throw new Error('Google Calendar is not connected')
    throw new Error('Calendar already synced')
  }
  try {
    await syncGoogleCalendarInbound(userId)
  } catch {
    throw new Error('Google Calendar sync failed')
  }
  return getCalendarConnection(userId)
}

export const calendarTools = [
  {
    name: 'list_calendar_events',
    description: 'List up to 100 calendar events in a required ISO date-time range. Default limit is 50.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start: { type: 'string', description: 'Range start as an ISO date-time.' },
        end: { type: 'string', description: 'Range end as an ISO date-time.' },
        limit: { type: 'number', minimum: 1, maximum: MAX_LIST_LIMIT, description: 'Maximum events to return (default 50).' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'list_calendar_overlays',
    description: 'List up to 100 MANA milestone and document deadline overlays in a required ISO date-time range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start: { type: 'string', description: 'Range start as an ISO date-time.' },
        end: { type: 'string', description: 'Range end as an ISO date-time.' },
        limit: { type: 'number', minimum: 1, maximum: MAX_LIST_LIMIT, description: 'Maximum overlays to return (default 50).' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a MANA calendar event. For all-day events provide startDate; for timed events provide startAt and endAt as ISO date-times. External MCP keeps it local unless syncToGoogle is true and confirmGoogleSync is true after user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        allDay: { type: 'boolean' },
        startDate: { type: ['string', 'null'], description: 'YYYY-MM-DD for all-day events.' },
        endDate: { type: ['string', 'null'], description: 'YYYY-MM-DD for all-day events.' },
        startAt: { type: ['string', 'null'], description: 'ISO date-time for timed events.' },
        endAt: { type: ['string', 'null'], description: 'ISO date-time for timed events.' },
        timeZone: { type: ['string', 'null'] },
        rrule: { type: ['string', 'null'], description: 'Optional RFC 5545 recurrence rule.' },
        alertMinutes: { type: ['array', 'null'], items: { type: 'number' } },
        contactId: { type: ['string', 'null'] },
        note: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
        calendarConnectionId: { type: ['string', 'null'], description: 'A synced MANA Google calendar connection ID.' },
        syncToGoogle: { type: 'boolean', description: 'External MCP defaults to false. Set true only after user confirmation.' },
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP when syncing this change to Google after the user confirms.' },
      },
      required: ['title', 'allDay'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Update a MANA calendar event. For a recurring event, use scope single or following with instanceStart to change only that occurrence or the remaining series. External MCP requires confirmGoogleSync true after user confirmation because an existing event may be synced to Google.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string' },
        title: { type: 'string' },
        allDay: { type: 'boolean' },
        startDate: { type: ['string', 'null'] },
        endDate: { type: ['string', 'null'] },
        startAt: { type: ['string', 'null'] },
        endAt: { type: ['string', 'null'] },
        timeZone: { type: ['string', 'null'] },
        rrule: { type: ['string', 'null'] },
        alertMinutes: { type: ['array', 'null'], items: { type: 'number' } },
        contactId: { type: ['string', 'null'] },
        note: { type: ['string', 'null'] },
        location: { type: ['string', 'null'] },
        scope: { type: 'string', enum: ['single', 'following', 'all'] },
        instanceStart: { type: 'string', description: 'Occurrence start as YYYY-MM-DD or ISO date-time, required for single and following.' },
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP after the user confirms a potential Google Calendar change.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a MANA calendar event. For a recurring event, choose all, single, or following; instanceStart is required for single and following. External MCP requires confirmGoogleSync true after user confirmation because an existing event may be synced to Google.',
    input_schema: {
      type: 'object' as const,
      properties: {
        eventId: { type: 'string' },
        scope: { type: 'string', enum: ['single', 'following', 'all'] },
        instanceStart: { type: 'string', description: 'Occurrence start as YYYY-MM-DD or ISO date-time, required for single and following.' },
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP after the user confirms a potential Google Calendar change.' },
      },
      required: ['eventId'],
    },
  },
  {
    name: 'get_calendar_connection',
    description: 'Get the current MANA Google Calendar connection status and synced calendars.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_google_calendars',
    description: 'List calendars available from Google accounts already connected to MANA. This never starts OAuth.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'select_google_calendar',
    description: 'Add one already-connected Google calendar to MANA sync, then perform an inbound sync. Requires a connected Google account and confirmGoogleSync true for external MCP after user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        accountId: { type: 'string' },
        calendarId: { type: 'string' },
        calendarName: { type: 'string' },
        accountEmail: { type: 'string' },
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP after the user confirms the Google Calendar sync.' },
      },
      required: ['accountId', 'calendarId', 'calendarName'],
    },
  },
  {
    name: 'remove_google_calendar',
    description: 'Remove one Google calendar from MANA sync. This does not disconnect the Google account or start OAuth. External MCP requires confirmGoogleSync true after user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        connectionId: { type: 'string' },
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP after the user confirms removing this MANA sync connection.' },
      },
      required: ['connectionId'],
    },
  },
  {
    name: 'sync_google_calendar',
    description: 'Pull updates from Google calendars already selected in MANA. Requires a connected Google account and confirmGoogleSync true for external MCP after user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        confirmGoogleSync: { type: 'boolean', description: 'Required as true by external MCP after the user confirms the Google Calendar sync.' },
      },
      required: [],
    },
  },
] as const

export const calendarHandlers: Record<string, McpToolHandler> = {
  'list_calendar_events': (userId, args) => listCalendarEvents(userId, { ...listRange(args), limit: listLimit(args) }),
  'list_calendar_overlays': async (userId, args) => {
    const overlays = await listCalendarOverlays(userId, listRange(args))
    return overlays.slice(0, listLimit(args))
  },
  'create_calendar_event': (userId, args, context) => {
    const event = createEventInput(args, context)
    if (event.syncToGoogle) requireGoogleSyncConfirmation(args, context)
    return createCalendarEvent(userId, event)
  },
  'update_calendar_event': async (userId, args, context) => {
    requireGoogleSyncConfirmation(args, context)
    const event = await patchCalendarEvent(userId, requiredString(args, 'eventId'), updateEventInput(args), mutationScope(args))
    if (!event) throw new Error('Calendar event not found')
    return event
  },
  'delete_calendar_event': async (userId, args, context) => {
    requireGoogleSyncConfirmation(args, context)
    const deleted = await deleteCalendarEvent(userId, requiredString(args, 'eventId'), mutationScope(args))
    if (!deleted) throw new Error('Calendar event not found')
    return { deleted: true, eventId: deleted.id }
  },
  'get_calendar_connection': (userId) => getCalendarConnection(userId),
  'list_google_calendars': async (userId) => {
    try {
      return await listGoogleCalendars(userId)
    } catch {
      throw new Error('Google Calendar is not connected')
    }
  },
  'select_google_calendar': (userId, args, context) => selectCalendar(userId, args, context),
  'remove_google_calendar': async (userId, args, context) => {
    requireGoogleSyncConfirmation(args, context)
    const removed = await removeGoogleCalendarConnection(userId, requiredString(args, 'connectionId'))
    if (!removed) throw new Error('Google calendar connection not found')
    return getCalendarConnection(userId)
  },
  'sync_google_calendar': async (userId, args, context) => {
    requireGoogleSyncConfirmation(args, context)
      try {
      return await syncGoogleCalendarInbound(userId)
    } catch {
      throw new Error('Google Calendar sync is not configured')
    }
  },
}
