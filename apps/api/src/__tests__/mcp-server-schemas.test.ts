import { describe, expect, it } from 'bun:test'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { buildMcpServer, externalMcpErrorMessage } from '@api/modules/mcp/service'

type Handlers = Map<string, (req: unknown) => Promise<unknown>>

function handlersOf(server: ReturnType<typeof buildMcpServer>) {
  return (server as unknown as { _requestHandlers: Handlers })._requestHandlers
}

describe('buildMcpServer', () => {
  it('advertises each external tool with its real input schema', async () => {
    const handlers = handlersOf(buildMcpServer('user-1'))
    const listed = (await handlers.get(ListToolsRequestSchema.shape.method.value)!({
      method: 'tools/list',
      params: {},
    })) as { tools: { name: string; inputSchema: { properties?: Record<string, unknown> } }[] }

    const withArgs = listed.tools.filter((t) => Object.keys(t.inputSchema.properties ?? {}).length > 0)

    expect(listed.tools.length).toBeGreaterThan(50)
    // Regression guard: the server used to register every tool with `{}`, so clients
    // could only call the handful of zero-arg tools.
    expect(withArgs.length).toBeGreaterThan(50)
    expect(listed.tools.find((t) => t.name === 'get_contact')?.inputSchema).toMatchObject({
      properties: { contactId: { type: 'string' } },
      required: ['contactId'],
    })
  })

  it('returns tool failures as isError content instead of throwing', async () => {
    const handlers = handlersOf(buildMcpServer('user-1'))
    const result = (await handlers.get(CallToolRequestSchema.shape.method.value)!({
      method: 'tools/call',
      params: { name: 'no_such_tool', arguments: {} },
    })) as { isError?: boolean; content: { text: string }[] }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('no_such_tool')
  })

  it('validates tool arguments against the advertised schema before dispatch', async () => {
    const handlers = handlersOf(buildMcpServer('user-1'))
    const result = (await handlers.get(CallToolRequestSchema.shape.method.value)!({
      method: 'tools/call',
      params: { name: 'get_contact', arguments: {} },
    })) as { isError?: boolean; content: { text: string }[] }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Invalid arguments for get_contact')
    expect(result.content[0].text).toContain("must have required property 'contactId'")
  })

  it('does not expose in-app-only tools to external MCP clients', async () => {
    const handlers = handlersOf(buildMcpServer('user-1'))
    const listed = (await handlers.get(ListToolsRequestSchema.shape.method.value)!({
      method: 'tools/list',
      params: {},
    })) as { tools: { name: string }[] }

    expect(listed.tools.some((tool) => tool.name === 'open_view')).toBe(false)
    expect(listed.tools.some((tool) => tool.name === 'upload_file_to_storage')).toBe(false)

    const result = (await handlers.get(CallToolRequestSchema.shape.method.value)!({
      method: 'tools/call',
      params: { name: 'open_view', arguments: { view: 'contact' } },
    })) as { isError?: boolean; content: { text: string }[] }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown or unavailable tool: open_view')
  })

  it('uses the user capability profile for both listing and dispatch', async () => {
    const handlers = handlersOf(buildMcpServer('user-1', ['get_contact']))
    const listed = (await handlers.get(ListToolsRequestSchema.shape.method.value)!({
      method: 'tools/list',
      params: {},
    })) as { tools: { name: string }[] }

    expect(listed.tools.some((tool) => tool.name === 'get_contact')).toBe(false)

    const result = (await handlers.get(CallToolRequestSchema.shape.method.value)!({
      method: 'tools/call',
      params: { name: 'get_contact', arguments: { contactId: 'contact-1' } },
    })) as { isError?: boolean; content: { text: string }[] }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown or unavailable tool: get_contact')
  })

  it('annotates read-only and destructive tools for MCP clients', async () => {
    const handlers = handlersOf(buildMcpServer('user-1'))
    const listed = (await handlers.get(ListToolsRequestSchema.shape.method.value)!({
      method: 'tools/list',
      params: {},
    })) as {
      tools: {
        name: string
        annotations?: {
          readOnlyHint?: boolean
          destructiveHint?: boolean
          idempotentHint?: boolean
          openWorldHint?: boolean
        }
      }[]
    }

    expect(listed.tools.find((tool) => tool.name === 'get_contact')?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    })
    expect(listed.tools.find((tool) => tool.name === 'delete_project')?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    })
    expect(listed.tools.find((tool) => tool.name === 'publish_document')?.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: false,
      openWorldHint: false,
    })
    expect(listed.tools.find((tool) => tool.name === 'sync_google_calendar')?.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: false,
      openWorldHint: true,
    })
  })

  it('does not pass unexpected provider or infrastructure errors through to clients', () => {
    expect(externalMcpErrorMessage(new Error('Google returned token=private-secret')))
      .toBe('Tool request failed. Check the supplied values and try again.')
  })
})
