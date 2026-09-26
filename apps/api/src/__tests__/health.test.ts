import { describe, it, expect } from 'bun:test'
import { app } from '@api/index'

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.timestamp).toBe('string')
  })
})
