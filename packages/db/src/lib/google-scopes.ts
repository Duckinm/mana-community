export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
]

export function hasGoogleCalendarScope(scope: string | null | undefined): boolean {
  if (!scope) return false
  const granted = scope.split(/[\s,]+/)
  return GOOGLE_CALENDAR_SCOPES.every((s) => granted.includes(s))
}

export function isGoogleCalendarScope(scope: string): boolean {
  return GOOGLE_CALENDAR_SCOPES.includes(scope)
}
