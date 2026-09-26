import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import {
  CalendarEventsQuery,
  CalendarScopeQuery,
  CreateCalendarEventBody,
  SelectGoogleCalendarBody,
  UpdateCalendarEventBody,
} from '@api/modules/calendar/model'
import {
  calendarSyncAllowed,
  disconnectGoogleCalendar,
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
import {
  CalendarConnectionResponse,
  CalendarEventsListResponse,
  CalendarOverlaysListResponse,
  CalendarEventResponse,
  GoogleCalendarsListResponse,
  CalendarSyncResponse,
  NotFoundResponse,
} from '@api/modules/calendar/responses'
import { NoContentResponse, MessageResponse } from '@api/lib/wire-schema'

export const calendarModule = new Elysia({ name: 'calendar', prefix: '/api/calendar' })
  .use(betterAuthPlugin)

  .get('/connection', async ({ user }) => {
    return getCalendarConnection(user.id)
  }, {
    auth: true,
    response: { 200: CalendarConnectionResponse },
    detail: { tags: ['Calendar'], summary: 'Get Google Calendar connection status' },
  })

  .get('/google/calendars', async ({ user, status }) => {
    try {
      return await listGoogleCalendars(user.id)
    } catch {
      return status(400, { message: 'Google Calendar is not connected' })
    }
  }, {
    auth: true,
    response: { 200: GoogleCalendarsListResponse, 400: MessageResponse },
    detail: { tags: ['Calendar'], summary: 'List Google calendars for the connected account' },
  })

  .patch('/connection', async ({ user, body, status }) => {
    if (!(await calendarSyncAllowed(user.id))) {
      return status(403, { message: 'PLAN_LIMIT_CALENDAR_SYNC' })
    }
    const result = await selectGoogleCalendar(user.id, body.accountId, body.calendarId, body.calendarName, body.accountEmail)
    if (!result.ok) {
      if (result.reason === 'not_connected') return status(400, { message: 'Google Calendar is not connected' })
      if (result.reason === 'limit') return status(403, { message: 'PLAN_LIMIT_CALENDAR_SYNC' })
      return status(409, { message: 'Calendar already synced' })
    }
    await syncGoogleCalendarInbound(user.id)
    return getCalendarConnection(user.id)
  }, {
    auth: true,
    body: SelectGoogleCalendarBody,
    response: {
      200: CalendarConnectionResponse,
      400: MessageResponse,
      403: MessageResponse,
      409: MessageResponse,
    },
    detail: { tags: ['Calendar'], summary: 'Add a Google calendar to sync' },
  })

  .delete('/connection/:connectionId', async ({ user, params, status }) => {
    const deleted = await removeGoogleCalendarConnection(user.id, params.connectionId)
    if (!deleted) return status(404, { message: 'Not found' })
    return getCalendarConnection(user.id)
  }, {
    auth: true,
    response: { 200: CalendarConnectionResponse, 404: MessageResponse },
    detail: { tags: ['Calendar'], summary: 'Remove one synced Google calendar' },
  })

  .delete('/connection', async ({ user }) => {
    return disconnectGoogleCalendar(user.id)
  }, {
    auth: true,
    response: { 200: CalendarConnectionResponse },
    detail: { tags: ['Calendar'], summary: 'Disconnect Google Calendar entirely' },
  })

  .post('/sync', async ({ user, status }) => {
    if (!(await calendarSyncAllowed(user.id))) {
      return status(403, { message: 'PLAN_LIMIT_CALENDAR_SYNC' })
    }
    try {
      return await syncGoogleCalendarInbound(user.id)
    } catch {
      return status(400, { message: 'Google Calendar sync is not configured' })
    }
  }, {
    auth: true,
    response: { 200: CalendarSyncResponse, 400: MessageResponse, 403: MessageResponse },
    detail: { tags: ['Calendar'], summary: 'Pull changes from Google Calendar' },
  })

  .get('/events', async ({ user, query }) => {
    return listCalendarEvents(user.id, { start: query.start, end: query.end })
  }, {
    auth: true,
    query: CalendarEventsQuery,
    response: { 200: CalendarEventsListResponse },
    detail: { tags: ['Calendar'], summary: 'List calendar events in date range' },
  })

  .get('/overlays', async ({ user, query }) => {
    return listCalendarOverlays(user.id, { start: query.start, end: query.end })
  }, {
    auth: true,
    query: CalendarEventsQuery,
    response: { 200: CalendarOverlaysListResponse },
    detail: { tags: ['Calendar'], summary: 'List read-only deadline overlays' },
  })

  .post('/events', async ({ user, status, body }) => {
    const event = await createCalendarEvent(user.id, body)
    return status(201, event)
  }, {
    auth: true,
    body: CreateCalendarEventBody,
    response: { 201: CalendarEventResponse },
    detail: { tags: ['Calendar'], summary: 'Create calendar event' },
  })

  .patch('/events/:id', async ({ user, status, params, body, query }) => {
    const updated = await patchCalendarEvent(user.id, params.id, body, {
      scope: query.scope,
      instanceStart: query.instanceStart,
    })
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateCalendarEventBody,
    query: CalendarScopeQuery,
    response: { 200: CalendarEventResponse, 404: NotFoundResponse },
    detail: { tags: ['Calendar'], summary: 'Update calendar event' },
  })

  .delete('/events/:id', async ({ user, status, params, query }) => {
    const deleted = await deleteCalendarEvent(user.id, params.id, {
      scope: query.scope,
      instanceStart: query.instanceStart,
    })
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    query: CalendarScopeQuery,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Calendar'], summary: 'Delete calendar event' },
  })
