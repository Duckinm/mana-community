import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CommandInput } from '@/components/command-input'
import '@/lib/i18n'

// Use the renderer's native React instance instead of Vite's transformed copy.
vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})
vi.mock('@/context/settings', () => ({ useSettings: () => ({ user: { aiVoiceEnabled: false } }) }))
vi.mock('@/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ data: { ai: true, transcription: false }, isPending: false, isError: false }),
}))

afterEach(cleanup)

it('retains text and attachments after a rejected submission and clears them only after retry succeeds', async () => {
  let settle: (accepted: boolean) => void = () => {}
  const submit = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { settle = resolve })).mockResolvedValueOnce(true)
  const { container } = render(<CommandInput onSubmit={submit} hasMessages />)
  const input = screen.getByRole<HTMLTextAreaElement>('textbox')
  const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const attachment = new File(['invoice contents'], 'invoice.txt', { type: 'text/plain' })
  fireEvent.change(input, { target: { value: 'Review this invoice' } })
  fireEvent.change(fileInput, { target: { files: [attachment] } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(input.disabled).toBe(true)
  expect(input.value).toBe('Review this invoice')
  await act(async () => settle(false))
  expect(input.disabled).toBe(false)
  expect(input.value).toBe('Review this invoice')
  expect(screen.getByText('invoice.txt')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(input.value).toBe(''))
  expect(screen.queryByText('invoice.txt')).toBeNull()
  expect(submit).toHaveBeenCalledTimes(2)
  expect(submit.mock.calls[1][0]).toBe('Review this invoice')
  expect(submit.mock.calls[1][1][0].file).toBe(attachment)
})

it('keeps the draft and allows retry when the submission throws', async () => {
  render(<CommandInput onSubmit={vi.fn().mockRejectedValue(new Error('Network unavailable'))} hasMessages />)
  const input = screen.getByRole<HTMLTextAreaElement>('textbox')
  fireEvent.change(input, { target: { value: 'Keep this draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(input.disabled).toBe(false))
  expect(input.value).toBe('Keep this draft')
})
