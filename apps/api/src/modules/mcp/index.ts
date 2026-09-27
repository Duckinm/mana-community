import Elysia from 'elysia'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { db } from '@api/db'
import { users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { buildMcpServer } from '@api/modules/mcp/service'
import { env } from '@api/env'
import { trustedWebOrigins } from '@api/lib/cors-origins'

const MCP_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function allowedMcpHosts() {
  const hosts = [new URL(env.BETTER_AUTH_URL).host, new URL(env.WEB_URL).host]
  if (env.NODE_ENV !== 'production') {
    const port = String(env.PORT)
    hosts.push(`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`, 'localhost', '127.0.0.1', '[::1]')
  }
  return [...new Set(hosts)]
}

function errorResponse(status: number, error: 'Forbidden' | 'Unauthorized') {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
    },
  })
}

function bearerToken(request: Request) {
  const match = request.headers.get('authorization')?.match(/^Bearer ([^\s,]+)$/)
  const token = match?.[1]
  return token && MCP_TOKEN_PATTERN.test(token) ? token : null
}

function trustedMcpRequest(request: Request) {
  if (!allowedMcpHosts().includes(request.headers.get('host') ?? '')) return false

  const origin = request.headers.get('origin')
  return !origin || trustedWebOrigins().includes(origin)
}

export const mcpModule = new Elysia({ prefix: '/mcp' })

  .all('/', async ({ request }) => {
    if (!trustedMcpRequest(request)) return errorResponse(403, 'Forbidden')

    const token = bearerToken(request)
    if (!token) return errorResponse(401, 'Unauthorized')

    const [user] = await db
      .select({ id: users.id, disabledExternalMcpTools: users.disabledExternalMcpTools })
      .from(users)
      .where(eq(users.mcpToken, token))

    if (!user) return errorResponse(401, 'Unauthorized')

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      allowedHosts: allowedMcpHosts(),
      allowedOrigins: trustedWebOrigins(),
      enableDnsRebindingProtection: true,
    })

    const mcpServer = buildMcpServer(user.id, user.disabledExternalMcpTools)

    await mcpServer.connect(transport)
    return transport.handleRequest(request)
  }, { detail: { tags: ['MCP'], summary: 'MCP endpoint (token auth)', hide: true } })
