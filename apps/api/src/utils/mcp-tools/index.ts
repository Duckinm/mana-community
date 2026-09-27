import { contactTools, contactHandlers } from '@api/utils/mcp-tools/contacts'
import { projectTools, projectHandlers } from '@api/utils/mcp-tools/projects'
import { financeTools, financeHandlers } from '@api/utils/mcp-tools/finance'
import { storageTools, storageHandlers } from '@api/utils/mcp-tools/storage'
import { aiTools, aiHandlers } from '@api/utils/mcp-tools/ai'
import { documentTools, documentHandlers } from '@api/utils/mcp-tools/documents'
import { reminderTools, reminderHandlers } from '@api/utils/mcp-tools/reminders'
import { libraryTools, libraryHandlers } from '@api/utils/mcp-tools/library'
import { labelTools, labelHandlers } from '@api/utils/mcp-tools/labels'
import { uiTools, uiHandlers } from '@api/utils/mcp-tools/ui'
import { calendarTools, calendarHandlers } from '@api/utils/mcp-tools/calendar'
import { claimAiAction, releaseAiAction } from '@api/modules/billing/usage'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'
import { mcpToolAnnotations } from '@api/utils/mcp-tools/capabilities'

const rawMcpToolDefinitions = [
  ...contactTools,
  ...projectTools,
  ...financeTools,
  ...storageTools,
  ...aiTools,
  ...documentTools,
  ...reminderTools,
  ...libraryTools,
  ...labelTools,
  ...uiTools,
  ...calendarTools,
] as const

export const mcpToolDefinitions = rawMcpToolDefinitions.map((tool) => ({
  ...tool,
  annotations: mcpToolAnnotations(tool.name),
}))

export const mcpToolGroups = (
  [
    ['contacts', contactTools],
    ['projects', projectTools],
    ['finance', financeTools],
    ['storage', storageTools],
    ['ai', aiTools],
    ['documents', documentTools],
    ['reminders', reminderTools],
    ['library', libraryTools],
    ['labels', labelTools],
    ['ui', uiTools],
    ['calendar', calendarTools],
    ] as const
).map(([group, tools]) => ({
  group: group as string,
  tools: tools.map((tool) => tool.name as string),
}))

export const mcpToolNames = new Set<string>(mcpToolDefinitions.map((tool) => tool.name))

const EXTERNAL_MCP_AI_ACTION_TOOLS = new Set([
  'generate_tasks',
  'break_down_task',
  'outreach_draft',
  'finance_narrative',
  'import_receipt_transaction',
])

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const MCP_TOOL_DISPATCH: Record<string, McpToolHandler> = {
  ...contactHandlers,
  ...projectHandlers,
  ...financeHandlers,
  ...storageHandlers,
  ...aiHandlers,
  ...documentHandlers,
  ...reminderHandlers,
  ...libraryHandlers,
  ...labelHandlers,
  ...uiHandlers,
  ...calendarHandlers,
}

export async function executeToolCall(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  context?: ToolContext,
): Promise<unknown> {
  const run = MCP_TOOL_DISPATCH[toolName]
  if (!run) throw new Error(`Unknown tool: ${toolName}`)

  let claimedAiAction = false
  if (context?.source === 'external-mcp' && EXTERNAL_MCP_AI_ACTION_TOOLS.has(toolName)) {
    await claimAiAction(userId)
    claimedAiAction = true
  }

  try {
    return await run(userId, args, context)
  } catch (err) {
    if (claimedAiAction) await releaseAiAction(userId, 'ai')
    throw err
  }
}
