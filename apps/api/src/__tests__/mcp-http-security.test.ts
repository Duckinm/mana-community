import { describe, expect, it } from 'bun:test'
import { mcpModule } from '@api/modules/mcp'

function request(path: string, headers: HeadersInit = {}) {
  return new Request(`http://localhost:4000${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      host: 'localhost:4000',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
  })
}

describe('MCP HTTP security', () => {
  it('does not accept an MCP token in the URL query string', async () => {
    const response = await mcpModule.handle(request('/mcp?token=not-a-bearer-token'))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('rejects requests with an untrusted Host before authentication', async () => {
    const response = await mcpModule.handle(request('/mcp/', { host: 'attacker.example' }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden' })
  })

  it('rejects cross-origin browser requests before authentication', async () => {
    const response = await mcpModule.handle(
      request('/mcp/', { origin: 'https://attacker.example' }),
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Forbidden' })
  })
})
