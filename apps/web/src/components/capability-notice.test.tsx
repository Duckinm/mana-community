import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import { CapabilityNotice, EmailCapabilityNotice } from '@/components/capability-notice'
import '@/lib/i18n'

const state = vi.hoisted(() => ({
  isError: false,
  isPending: false,
  data: { email: 'disabled' },
  refetch: vi.fn(),
}))

vi.mock('@/hooks/use-capabilities', () => ({ useCapabilities: () => state }))

beforeEach(() => {
  state.isError = false
  state.isPending = false
  state.data = { email: 'disabled' }
})

it('keeps missing AI configuration visible while available AI has no warning', () => {
  expect(renderToStaticMarkup(<CapabilityNotice available={false} unavailableKey="aiUnavailable" />))
    .toContain('AI is not configured')
  expect(renderToStaticMarkup(<CapabilityNotice available unavailableKey="aiUnavailable" />)).toBe('')
})

it('distinguishes a failed availability check from disabled configuration, even with stale data', () => {
  state.isError = true
  const html = renderToStaticMarkup(<CapabilityNotice available unavailableKey="aiUnavailable" />)
  expect(html).toContain('Could not check available services')
  expect(html).toContain('<button')
  expect(html).not.toContain('AI is not configured')
})

it('shows pending checks without claiming the provider is missing', () => {
  state.isPending = true
  const html = renderToStaticMarkup(<CapabilityNotice available={undefined} unavailableKey="aiUnavailable" />)
  expect(html).toContain('Checking available services')
  expect(html).not.toContain('AI is not configured')
})

it('explicitly separates local email capture, disabled delivery, and external delivery', () => {
  state.data.email = 'local'
  expect(renderToStaticMarkup(<EmailCapabilityNotice />)).toContain('not delivered to external recipients')
  state.data.email = 'disabled'
  expect(renderToStaticMarkup(<EmailCapabilityNotice />)).toContain('Email delivery is not configured')
  state.data.email = 'resend'
  expect(renderToStaticMarkup(<EmailCapabilityNotice />)).toBe('')
})
