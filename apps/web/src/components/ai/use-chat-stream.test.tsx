import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useChatStream } from '@/components/ai/use-chat-stream'
import i18next from '@/lib/i18n'

// Use the renderer's native React instance instead of Vite's transformed copy.
vi.mock('react', async () => {
  const { createRequire } = await import('node:module')
  const react = createRequire(import.meta.url)('react')
  return { ...react, default: react }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function unavailableResponse() {
  return Response.json({ code: 'AI_NOT_CONFIGURED', message: 'AI is not configured' }, { status: 503 })
}

it('keeps an HTTP unavailable error visible after settling and clearing message history', async () => {
  const fetchMock = vi.fn().mockResolvedValue(unavailableResponse())
  vi.stubGlobal('fetch', fetchMock)
  const settled = vi.fn()
  const { result, rerender } = renderHook(() => useChatStream('session-1', null, undefined, undefined, undefined, settled))
  await act(async () => { await result.current.sendMessage('Hello') })

  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(result.current.isStreaming).toBe(false)
  expect(result.current.toolStatus).toBeNull()
  expect(result.current.error).toBe(i18next.t('aiUnavailable', { ns: 'capabilities' }))
  expect(result.current.messages.some(message => message.isStreaming)).toBe(false)
  expect(settled).not.toHaveBeenCalled()
  act(() => result.current.clearMessages())
  rerender()
  expect(result.current.messages).toEqual([])
  expect(result.current.error).toBe(i18next.t('aiUnavailable', { ns: 'capabilities' }))
})

it('preserves an SSE provider error without triggering the history reload that erased it', async () => {
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode([
        'data: {"type":"text_delta","text":"Partial answer"}',
        'data: {"type":"error","message":"Provider unavailable; try again"}',
        '',
      ].join('\n')))
    },
    cancel() { cancelled = true },
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)))
  const settled = vi.fn()
  const { result, rerender } = renderHook(() => useChatStream('session-1', null, undefined, undefined, undefined, settled))
  await act(async () => { await result.current.sendMessage('Hello') })

  expect(result.current.error).toBe(i18next.t('streamFailed', { ns: 'chat' }))
  expect(result.current.messages.at(-1)).toMatchObject({ content: 'Partial answer', isStreaming: false })
  expect(result.current.isStreaming).toBe(false)
  expect(result.current.toolStatus).toBeNull()
  expect(cancelled).toBe(true)
  expect(settled).not.toHaveBeenCalled()
  rerender()
  expect(result.current.error).toBe(i18next.t('streamFailed', { ns: 'chat' }))
})

it('reports premature EOF and accepts a new send after releasing the streaming lock', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response('data: {"type":"text_delta","text":"Unfinished"}\n\n'))
    .mockResolvedValueOnce(unavailableResponse())
  vi.stubGlobal('fetch', fetchMock)
  const settled = vi.fn()
  const { result } = renderHook(() => useChatStream('session-1', null, undefined, undefined, undefined, settled))
  await act(async () => { await result.current.sendMessage('Hello') })

  expect(result.current.error).toBe(i18next.t('streamInterrupted', { ns: 'chat' }))
  expect(result.current.isStreaming).toBe(false)
  expect(result.current.toolStatus).toBeNull()
  expect(result.current.messages.at(-1)).toMatchObject({ content: 'Unfinished', isStreaming: false })
  expect(settled).not.toHaveBeenCalled()
  await act(async () => { await result.current.sendMessage('Try again') })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(result.current.isStreaming).toBe(false)
  expect(result.current.error).toBe(i18next.t('aiUnavailable', { ns: 'capabilities' }))
})
