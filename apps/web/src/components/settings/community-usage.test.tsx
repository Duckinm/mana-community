import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { UsagePanel } from '@/components/settings/usage-panel'
import { CommunityPanel } from '@/components/settings/community-panel'
import { SETTINGS_SECTIONS, SETTINGS_SECTION_ROUTES } from '@/components/settings/settings-sections'
import { useShowBranding } from '@/hooks/use-show-branding'
import '@/lib/i18n'

vi.mock('@/components/settings/usage-heatmap', () => ({ UsageHeatmap: () => <div>Usage activity</div> }))
vi.mock('@/context/settings', () => ({ useSettings: () => ({ user: { plan: 'free', hideBranding: true } }) }))

it('offers usage without a billing destination or subscription action', () => {
  expect(SETTINGS_SECTION_ROUTES.usage).toBe('/settings/usage')
  expect(SETTINGS_SECTIONS.some(section => String(section.id) === 'billing')).toBe(false)
  const html = renderToStaticMarkup(<UsagePanel />)
  expect(html).toContain('All core features are free to use')
  expect(html).toContain('provider costs still apply')
  expect(html).toContain('Usage activity')
  expect(html).not.toMatch(/checkout|upgrade|Stripe/i)
})

it('respects branding preferences without a paid-plan check', () => {
  expect(useShowBranding()).toBe(false)
})

it('links the real community without invented referral offers or member counts', () => {
  const html = renderToStaticMarkup(<CommunityPanel />)
  expect(html).toContain('https://github.com/Duckinm/mana-community/issues')
  expect(html).not.toMatch(/months free|subscribes|2,412|2412|referral/i)
})
