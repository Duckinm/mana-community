import { describe, expect, it } from 'bun:test'
import { notificationPreferenceEnabled } from '@api/modules/notifications/preferences'

describe('notification preferences', () => {
  it('uses channel defaults when a stored map does not contain a key', () => {
    expect(notificationPreferenceEnabled({}, 'quotationViewed', 'line')).toBe(true)
    expect(notificationPreferenceEnabled({}, 'quotationExpiring', 'line')).toBe(false)
  })

  it('honors an explicit per-event channel override', () => {
    expect(notificationPreferenceEnabled({ 'invoiceViewed.email': false }, 'invoiceViewed', 'email')).toBe(false)
    expect(notificationPreferenceEnabled({ 'invoiceViewed.push': true }, 'invoiceViewed', 'push')).toBe(true)
  })
})
