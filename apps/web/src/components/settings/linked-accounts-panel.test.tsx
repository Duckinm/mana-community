import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LinkedAccountsPanel } from '@/components/settings/linked-accounts-panel'
import '@/lib/i18n'

vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})
const state = vi.hoisted(() => ({
  isError: false, isPending: false, refetch: vi.fn(),
  data: { socialProviders: { google: false, discord: true, facebook: false } },
  accounts: [] as { providerId: string }[], connect: vi.fn(), disconnect: vi.fn(),
}))
vi.mock('@/hooks/use-capabilities', () => ({ useCapabilities: () => state }))
vi.mock('@/hooks/use-linked-accounts', () => ({ useLinkedAccounts: () => ({
  accounts: state.accounts, isLoading: false, isPending: false,
  connect: state.connect, disconnect: state.disconnect,
}) }))
beforeEach(() => { state.isError = false; state.isPending = false; state.accounts = [] })
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('only connects configured providers and explains unavailable options', () => {
  render(<LinkedAccountsPanel />)
  const buttons = screen.getAllByRole('button', { name: 'Connect' })
  expect(buttons.map(button => button.hasAttribute('disabled'))).toEqual([true, false, true])
  fireEvent.click(buttons[0])
  expect(state.connect).not.toHaveBeenCalled()
  fireEvent.click(buttons[1])
  expect(state.connect).toHaveBeenCalledWith('discord')
  expect(screen.getByRole('status').textContent).toContain('not configured')
})

it('blocks stale connection options after capability failure but keeps existing unlink usable', () => {
  state.isError = true
  state.accounts = [{ providerId: 'google' }]
  render(<LinkedAccountsPanel />)
  expect(screen.getAllByRole('button', { name: 'Connect' }).every(button => button.hasAttribute('disabled'))).toBe(true)
  const disconnect = screen.getByRole('button', { name: 'Disconnect' })
  expect(disconnect.hasAttribute('disabled')).toBe(false)
  fireEvent.click(disconnect)
  expect(state.disconnect).toHaveBeenCalledWith('google')
  expect(screen.getByRole('status').textContent).toContain('Could not check available services')
})
