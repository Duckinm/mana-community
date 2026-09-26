import { importReceipts } from '@/components/finance/import-receipts'
import { afterEach, describe, expect, it, vi } from 'vitest'

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

function mockImports(handler: (name: string) => Promise<Response>) {
  let inFlight = 0
  let peak = 0
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const name = ((init.body as FormData).get('file') as File).name
    inFlight++
    peak = Math.max(peak, inFlight)
    try {
      return await handler(name)
    } finally {
      inFlight--
    }
  })
  return () => peak
}

const ok = (name: string) =>
  new Response(JSON.stringify({ transaction: { id: name } }), { status: 200 })

afterEach(() => vi.unstubAllGlobals())

describe('importReceipts', () => {
  it('imports every file in the batch', async () => {
    mockImports(async (name) => ok(name))
    const results = await importReceipts([file('a'), file('b'), file('c'), file('d')])

    expect(results).toHaveLength(4)
    expect(results.map((r) => r.transaction?.id).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('never runs more than three imports at once', async () => {
    const peak = mockImports(
      async (name) => new Promise((res) => setTimeout(() => res(ok(name)), 5)),
    )
    await importReceipts(Array.from({ length: 9 }, (_, i) => file(`f${i}`)))

    expect(peak()).toBe(3)
  })

  // One unreadable photo in a batch of five must not cost the user the other four.
  it('isolates a failure to its own file', async () => {
    mockImports(async (name) =>
      name === 'bad'
        ? new Response(JSON.stringify({ error: 'Could not read this receipt.' }), { status: 400 })
        : ok(name),
    )
    const results = await importReceipts([file('a'), file('bad'), file('c')])

    expect(results.filter((r) => r.transaction)).toHaveLength(2)
    expect(results.find((r) => r.error)?.file.name).toBe('bad')
    expect(results.find((r) => r.error)?.error).toBe('Could not read this receipt.')
  })
})
