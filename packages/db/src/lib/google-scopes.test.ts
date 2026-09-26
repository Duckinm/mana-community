import { expect, test } from 'bun:test'
import {
  GOOGLE_CALENDAR_SCOPES,
  hasGoogleCalendarScope,
  isGoogleCalendarScope,
} from './google-scopes'

test('accepts the full granular scope set', () => {
  expect(hasGoogleCalendarScope(GOOGLE_CALENDAR_SCOPES.join(' '))).toBe(true)
})

test('rejects a partial grant', () => {
  expect(hasGoogleCalendarScope(GOOGLE_CALENDAR_SCOPES[0])).toBe(false)
})

test('rejects the retired full calendar scope', () => {
  expect(hasGoogleCalendarScope('openid https://www.googleapis.com/auth/calendar')).toBe(false)
})

test('ignores unrelated scopes', () => {
  expect(hasGoogleCalendarScope('openid email profile')).toBe(false)
  expect(hasGoogleCalendarScope(null)).toBe(false)
})

test('disconnect strips every calendar scope, keeps login scopes', () => {
  const remaining = `openid email ${GOOGLE_CALENDAR_SCOPES.join(' ')}`
    .split(/[\s,]+/)
    .filter((s) => s && !isGoogleCalendarScope(s))
  expect(remaining).toEqual(['openid', 'email'])
})
