import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkspaceHome } from '@/components/onboarding/workspace-home'
import i18next from '@/lib/i18n'

vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})
const state = vi.hoisted(() => ({
  navigate: vi.fn(), isPending: false,
  done: { contact: false, project: false, document: false, transaction: false },
}))
vi.mock('@tanstack/react-router', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/react-router')>(),
  useNavigate: () => state.navigate,
  Link: ({ to, children, ...rest }: { to: string, children: import('react').ReactNode }) => <a href={to} {...rest}>{children}</a>,
}))
vi.mock('@/components/onboarding/get-started-steps', async importOriginal => ({
  ...await importOriginal<typeof import('@/components/onboarding/get-started-steps')>(),
  useGetStarted: () => ({ ...state, isError: false, refetch: vi.fn(), completed: Object.values(state.done).filter(Boolean).length }),
}))
beforeEach(async () => {
  await i18next.changeLanguage('en')
  state.isPending = false
  state.done = { contact: false, project: false, document: false, transaction: false }
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('resumes after an existing contact instead of forcing a repeated first step', () => {
  state.done.contact = true
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: /Next:.*project/i }))
  expect(state.navigate).toHaveBeenCalledWith({ to: '/projects' })
})

it('opens a real quotation editor for the document step', () => {
  state.done.contact = true
  state.done.project = true
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: /Next:.*document/i }))
  expect(state.navigate).toHaveBeenCalledWith({ to: '/documents/new', search: { type: 'QO' } })
})

it('opens a manual transaction form for the remaining step', () => {
  state.done = { contact: true, project: true, document: true, transaction: false }
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: /Next:.*transaction/i }))
  expect(state.navigate).toHaveBeenCalledWith(expect.objectContaining({
    to: '/accounting/transactions', search: expect.objectContaining({ txId: 'new' }),
  }))
})

it('opens the transaction list for a returning user without creating another record', () => {
  state.done = { contact: true, project: true, document: true, transaction: true }
  render(<WorkspaceHome />)
  fireEvent.click(screen.getByRole('button', { name: /^Transactions/ }))
  expect(state.navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/accounting/transactions', search: expect.objectContaining({ txId: undefined }) }))
})

it('does not invent progress or a first action while the checklist loads', () => {
  state.isPending = true
  const { container } = render(<WorkspaceHome />)
  expect(container.querySelector('[aria-busy="true"]')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Next:/ })).toBeNull()
  expect(screen.queryByText(/0 of 4/)).toBeNull()
})
