import { expect, test } from 'vitest'
import { consumeSseJsonEvents } from '@/lib/chat-stream'

function stream(text: string) {
  return new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(new TextEncoder().encode(text))
    controller.close()
  } })
}

test('rejects a truncated response instead of leaving chat busy', async () => {
  await expect(consumeSseJsonEvents(stream('data: {"type":"text_delta","text":"partial"}\n\n'), () => {})).rejects.toThrow('CHAT_STREAM_INTERRUPTED')
})

test('accepts a terminal error without requiring the server to close', async () => {
  let cancelled = false
  const events: Record<string, unknown>[] = []
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"error","message":"Unavailable"}\n\n')) },
    cancel() { cancelled = true },
  })
  await consumeSseJsonEvents(body, event => events.push(event))
  expect(events).toEqual([{ type: 'error', message: 'Unavailable' }])
  expect(cancelled).toBe(true)
})

test('cancel interrupts a silent stream', async () => {
  const controller = new AbortController()
  const result = consumeSseJsonEvents(new ReadableStream(), () => {}, controller.signal)
  controller.abort()
  await expect(result).rejects.toHaveProperty('name', 'AbortError')
})

test('silent streams time out and cancel the reader', async () => {
  let cancelled = false
  const body = new ReadableStream({ cancel() { cancelled = true } })
  await expect(consumeSseJsonEvents(body, () => {}, undefined, 5)).rejects.toThrow('CHAT_STREAM_TIMEOUT')
  expect(cancelled).toBe(true)
})

test('handles split UTF-8 chunks, heartbeat and terminal done', async () => {
  const bytes = new TextEncoder().encode(': ping\n\ndata: {"type":"text_delta","text":"ไทย"}\n\ndata: {"type":"done"}\n\n')
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
    controller.close()
  } })
  const events: Record<string, unknown>[] = []
  await consumeSseJsonEvents(body, event => events.push(event))
  expect(events).toEqual([{type:'text_delta',text:'ไทย'}, {type:'done'}])
})

test('request deadline interrupts a stream kept alive only by heartbeats', async () => {
  const abort = new AbortController()
  let interval: ReturnType<typeof setInterval>
  let cancelled = false
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      interval = setInterval(() => controller.enqueue(new TextEncoder().encode(': ping\n\n')), 2)
    },
    cancel() {
      clearInterval(interval)
      cancelled = true
    },
  })
  const deadline = setTimeout(() => abort.abort(new Error('CHAT_STREAM_TIMEOUT')), 20)
  try {
    await expect(consumeSseJsonEvents(body, () => {}, abort.signal, 100)).rejects.toThrow('CHAT_STREAM_TIMEOUT')
    expect(cancelled).toBe(true)
  } finally {
    clearTimeout(deadline)
    clearInterval(interval!)
  }
})
