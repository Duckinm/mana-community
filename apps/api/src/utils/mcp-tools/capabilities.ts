export const MCP_CAPABILITY_PROFILES = ['chat', 'external-mcp'] as const

export type McpCapabilityProfile = typeof MCP_CAPABILITY_PROFILES[number]

const MUTATING_TOOL_PREFIXES = [
  'add_', 'archive_', 'bulk_', 'create_', 'delete_', 'duplicate_', 'import_',
  'link_', 'mark_', 'move_', 'pin_', 'publish_', 'remove_', 'rename_',
  'restore_', 'send_', 'select_', 'set_', 'sync_', 'update_',
]

const DESTRUCTIVE_TOOL_NAMES = new Set([
  'delete_chat_session', 'delete_contact', 'delete_file', 'delete_folder',
  'delete_item_template', 'delete_item_template_group', 'delete_label',
  'delete_project', 'delete_remark_template', 'delete_task', 'delete_transaction',
  'bulk_delete_transactions', 'delete_calendar_event', 'remove_google_calendar',
])

const OPEN_WORLD_TOOL_NAMES = new Set([
  'send_document_email', 'send_reminder', 'create_calendar_event',
  'update_calendar_event', 'delete_calendar_event', 'select_google_calendar',
  'sync_google_calendar',
])

const NON_IDEMPOTENT_READ_ONLY_TOOL_NAMES = new Set([
  'break_down_task', 'finance_narrative', 'generate_tasks', 'outreach_draft',
])

export type McpToolAnnotations = {
  title: string
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint: boolean
  openWorldHint: boolean
}

export function mcpToolAnnotations(name: string): McpToolAnnotations {
  const readOnlyHint = !MUTATING_TOOL_PREFIXES.some((prefix) => name.startsWith(prefix))
  return {
    title: name.replaceAll('_', ' '),
    readOnlyHint,
    destructiveHint: DESTRUCTIVE_TOOL_NAMES.has(name),
    idempotentHint: readOnlyHint && !NON_IDEMPOTENT_READ_ONLY_TOOL_NAMES.has(name),
    openWorldHint: OPEN_WORLD_TOOL_NAMES.has(name),
  }
}

export const EXTERNAL_MCP_TOOL_NAMES = [
  'add_contact_note',
  'add_templates_to_group',
  'archive_project',
  'break_down_task',
  'bulk_create_tasks',
  'bulk_update_task_status',
  'create_contact',
  'create_calendar_event',
  'create_document',
  'create_folder',
  'create_item_template',
  'create_item_template_group',
  'create_label',
  'create_project',
  'create_remark_template',
  'create_task',
  'create_transaction',
  'delete_project',
  'delete_task',
  'duplicate_project',
  'duplicate_task',
  'finance_narrative',
  'generate_tasks',
  'get_contact',
  'get_contact_activity',
  'get_contact_documents',
  'get_contact_projects',
  'get_contact_transactions',
  'get_contacts',
  'get_calendar_connection',
  'get_contacts_with_open_invoices',
  'get_document',
  'get_cash_flow_forecast',
  'get_item_template_groups',
  'get_item_templates',
  'get_labels',
  'get_outreach_queue',
  'get_plan_usage',
  'get_project',
  'get_project_profitability',
  'get_projects',
  'get_remark_templates',
  'get_revenue_this_quarter',
  'get_sender_profiles',
  'get_storage_summary',
  'get_tasks',
  'get_tax_estimate',
  'get_transaction',
  'get_transactions',
  'import_receipt_transaction',
  'link_contact_to_project',
  'link_transaction_to_document',
  'list_files',
  'list_calendar_events',
  'list_calendar_overlays',
  'list_documents',
  'list_files_by_entity',
  'list_folders',
  'move_file',
  'outreach_draft',
  'publish_document',
  'remove_template_from_group',
  'rename_file',
  'rename_folder',
  'restore_project',
  'restore_task',
  'search_contacts',
  'search_files',
  'set_default_remark_template',
  'suggest_outreach',
  'summarize_contact',
  'sync_google_calendar',
  'update_contact',
  'update_calendar_event',
  'update_item_template',
  'update_label',
  'update_project',
  'update_remark_template',
  'update_task',
  'update_transaction',
] as const

const externalMcpToolNameSet = new Set<string>(EXTERNAL_MCP_TOOL_NAMES)

type McpToolDefinition = { name: string }
type McpToolGroup = { group: string; tools: readonly string[] }

function isAllowed(
  profile: McpCapabilityProfile,
  toolName: string,
  disabledToolNames: ReadonlySet<string>,
) {
  if (disabledToolNames.has(toolName)) return false
  if (profile === 'chat') return true
  return profile === 'external-mcp' && externalMcpToolNameSet.has(toolName)
}

export function isExternalMcpToolName(toolName: string) {
  return externalMcpToolNameSet.has(toolName)
}

export function isMcpToolAllowed(
  profile: McpCapabilityProfile,
  toolName: string,
  disabledToolNames: readonly string[] = [],
) {
  return isAllowed(profile, toolName, new Set(disabledToolNames))
}

export function toolsForMcpCapability<T extends McpToolDefinition>(
  tools: readonly T[],
  profile: McpCapabilityProfile,
  disabledToolNames: readonly string[] = [],
) {
  const disabled = new Set(disabledToolNames)
  return tools.filter((tool) => isAllowed(profile, tool.name, disabled))
}

export function toolGroupsForMcpCapability<T extends McpToolGroup>(
  groups: readonly T[],
  profile: McpCapabilityProfile,
  disabledToolNames: readonly string[] = [],
) {
  const disabled = new Set(disabledToolNames)
  return groups.flatMap(({ group, tools }) => {
    const allowedTools = tools.filter((tool) => isAllowed(profile, tool, disabled))
    return allowedTools.length ? [{ group, tools: allowedTools }] : []
  })
}
