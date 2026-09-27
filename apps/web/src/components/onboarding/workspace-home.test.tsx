import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { WorkspaceHome } from '@/components/onboarding/workspace-home'
import i18next from '@/lib/i18n'

vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})
const state = vi.hoisted(() => ({
  navigate: vi.fn(), refetch: vi.fn(), isPending: false, isError: false,
  done: { contact: false, project: false, document: false, transaction: false },
}))
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/react-router')>(),
  useNavigate: () => state.navigate,
  Link: ({ to, children, ...rest }: { to: string, children: import('react').ReactNode }) => <a href={to} {...rest}>{children}</a>,
}))
vi.mock('@/components/onboarding/get-started-steps', async importOriginal => ({
  ...await importOriginal<typeof import('@/components/onboarding/get-started-steps')>(),
  useGetStarted: () => ({ ...state, completed: Object.values(state.done).filter(Boolean).length }),
}))
beforeEach(async () => {
  await i18next.changeLanguage('en')
  state.isPending = false; state.isError = false
  state.done = { contact: false, project: false, document: false, transaction: false }
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('offers the first real manual action without profile, provider or payment setup', () => {
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: 'Next: Add your first contact' }))
  expect(state.navigate).toHaveBeenCalledWith({ to: '/contacts', search: { q: '', sort: 'projects' } })
  expect(screen.getByText(/no AI account required/)).toBeTruthy()
  expect(screen.queryByText(/claim|upgrade|5 AI Actions/i)).toBeNull()
})
it('keeps completed users in normal work instead of replaying onboarding', () => {
  state.done = { contact: true, project: true, document: true, transaction: true }
  render(<WorkspaceHome />)
  expect(screen.getByRole('heading', { name: 'Continue your work' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /Documents/ }))
  expect(state.navigate).toHaveBeenCalledWith({ to: '/documents' })
  expect(screen.queryByText(/first steps complete/)).toBeNull()
})
it('shows a retry instead of inventing incomplete progress when loading fails', () => {
  state.isError = true
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }))
  expect(state.refetch).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: /Next:/ })).toBeNull()
})
