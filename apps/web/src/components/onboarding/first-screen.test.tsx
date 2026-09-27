import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppEntry } from '@/components/shells/app-entry'

vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), session: { user: { id: 'new-user' } as { id: string } | null, isLoading: false } }))
vi.mock('@/context/session', () => ({ useSessionContext: () => mocks.session }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
}))
afterEach(() => { cleanup(); mocks.navigate.mockClear(); mocks.session.user = { id: 'new-user' }; mocks.session.isLoading = false })
const Entry = AppEntry

it('opens the manual workspace home for a signed-in user without waiting for AI', () => {
  render(<Entry />)
  expect(mocks.navigate).toHaveBeenCalledWith({ to: '/home', replace: true })
})
it('keeps signed-out users on the login path and waits during session loading', () => {
  mocks.session.isLoading = true
  const view = render(<Entry />)
  expect(mocks.navigate).not.toHaveBeenCalled()
  mocks.session.isLoading = false
  mocks.session.user = null
  view.rerender(<Entry />)
  expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
})
