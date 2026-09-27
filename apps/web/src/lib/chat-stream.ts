export async function consumeSseJsonEvents(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
  idleTimeoutMs = 60_000,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    while (true) {
      signal?.throwIfAborted()
      timer = setTimeout(() => { timedOut = true; cancel() }, idleTimeoutMs)
      const { done, value } = await reader.read()
      clearTimeout(timer)
      signal?.throwIfAborted()
      if (timedOut) throw new Error('CHAT_STREAM_TIMEOUT')
      if (done) throw new Error('CHAT_STREAM_INTERRUPTED')
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw) continue
        let event: Record<string, unknown>
        try {
          const parsed: unknown = JSON.parse(raw)
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
          event = parsed as Record<string, unknown>
        } catch {
          continue
        }
        onEvent(event)
        if (['done', 'error', 'cap_reached'].includes(String(event.type))) return
      }
    }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
