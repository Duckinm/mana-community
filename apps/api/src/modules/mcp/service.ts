import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv'
import type { JsonSchemaType, JsonSchemaValidator } from '@modelcontextprotocol/sdk/validation'
import { mcpToolDefinitions, executeToolCall } from '@api/utils/mcp-tools'
import { isMcpToolAllowed, toolsForMcpCapability } from '@api/utils/mcp-tools/capabilities'
import { AppError } from '@api/lib/errors'

const EXTERNAL_MCP_INSTRUCTIONS =
  'Use the smallest relevant tool call. Start with a bounded list or search before reading details. Ask for confirmation before destructive changes or Google Calendar sync changes. Never ask for, reveal, or use passwords, OAuth tokens, or other credentials. MANA only exposes the account that owns this token; tool lists and results are intentionally scoped.'

export const externalMcpToolDefinitions = toolsForMcpCapability(
  mcpToolDefinitions,
  'external-mcp',
)

const jsonSchemaValidator = new AjvJsonSchemaValidator()
const inputValidators = new Map<string, JsonSchemaValidator<Record<string, unknown>>>(
  externalMcpToolDefinitions.map((tool) => [
    tool.name,
    jsonSchemaValidator.getValidator<Record<string, unknown>>(tool.input_schema as JsonSchemaType),
  ]),
)

function structuredContentFor(result: unknown): Record<string, unknown> {
  if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
    return result as Record<string, unknown>
  }
  return { result: result ?? null }
}

function serializedResult(result: unknown) {
  return JSON.stringify(result, null, 2) ?? 'null'
}

export function externalMcpErrorMessage(err: unknown) {
  if (err instanceof AppError) return err.message
  if (err instanceof Error && (
    err.message.startsWith('Unknown or unavailable tool:')
    || err.message.startsWith('Invalid arguments for ')
    || err.message.startsWith('PLAN_LIMIT_')
  )) return err.message
  return 'Tool request failed. Check the supplied values and try again.'
}

export function buildMcpServer(userId: string, disabledExternalMcpTools: readonly string[] = []): Server {
  const availableTools = toolsForMcpCapability(
    mcpToolDefinitions,
    'external-mcp',
    disabledExternalMcpTools,
  )
  const availableToolsByName = new Map<string, (typeof availableTools)[number]>(
    availableTools.map((tool) => [tool.name, tool]),
  )
  const server = new Server(
    { name: 'mana', version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: EXTERNAL_MCP_INSTRUCTIONS },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: availableTools.map((def) => ({
      name: def.name,
      description: def.description,
      inputSchema: def.input_schema,
      annotations: def.annotations,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      if (
        !isMcpToolAllowed('external-mcp', name, disabledExternalMcpTools) ||
        !availableToolsByName.has(name)
      ) {
        throw new Error(`Unknown or unavailable tool: ${name}`)
      }

      const validation = inputValidators.get(name)!(args ?? {})
      if (!validation.valid) throw new Error(`Invalid arguments for ${name}: ${validation.errorMessage}`)

      const result = await executeToolCall(userId, name, validation.data, { source: 'external-mcp' })
      return {
        content: [{ type: 'text' as const, text: serializedResult(result) }],
        structuredContent: structuredContentFor(result),
      }
    } catch (err) {
      // Surface tool failures to the model as content so it can retry with better
      // args, rather than as a protocol error that aborts the turn.
      return {
        isError: true,
        content: [{ type: 'text' as const, text: externalMcpErrorMessage(err) }],
      }
    }
  })

  return server
}
