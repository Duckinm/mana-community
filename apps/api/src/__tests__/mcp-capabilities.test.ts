import { describe, expect, it } from 'bun:test'
import {
  isMcpToolAllowed,
  toolGroupsForMcpCapability,
  toolsForMcpCapability,
} from '@api/utils/mcp-tools/capabilities'

describe('external MCP capability profile', () => {
  it('allows the bounded AI workflows and denies unknown, sensitive, or in-app-only tools', () => {
    for (const name of ['generate_tasks', 'break_down_task', 'outreach_draft', 'finance_narrative', 'import_receipt_transaction']) {
      expect(isMcpToolAllowed('external-mcp', name)).toBe(true)
    }

    expect(isMcpToolAllowed('external-mcp', 'open_view')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'upload_file_to_storage')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_download_url')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_email_logs')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'export_contacts')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'delete_label')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'send_document_email')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'send_reminder')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_financial_summary')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_tasks_by_status')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_tasks_by_priority')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_contacts_by_company')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'list_files_for_contact')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'update_relationship_level')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'update_task_status')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'mark_transaction_paid')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_unpaid_invoices')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_overdue_invoices')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_project_trash')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_transactions_by_project')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_unlinked_transactions')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_expense_by_wallet')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_monthly_breakdown')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_profit_by_month')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_project_completion')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_revenue_by_project')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_transactions_by_category')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'update_sender_profile')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'set_default_sender_profile')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'delete_calendar_event')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'list_google_calendars')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'select_google_calendar')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'remove_google_calendar')).toBe(false)
    expect(isMcpToolAllowed('external-mcp', 'get_labels')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'create_label')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'list_documents')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'get_document')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'publish_document')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'future_tool')).toBe(false)
  })

  it('applies owner-disabled external tools to lists and direct calls', () => {
    const tools = [
      { name: 'get_projects' },
      { name: 'generate_tasks' },
      { name: 'open_view' },
    ]

    expect(toolsForMcpCapability(tools, 'external-mcp', ['generate_tasks']))
      .toEqual([{ name: 'get_projects' }])
    expect(isMcpToolAllowed('external-mcp', 'generate_tasks', ['generate_tasks'])).toBe(false)
  })

  it('omits empty groups from the external catalog', () => {
    const groups = [
      { group: 'projects', tools: ['get_projects', 'open_view'] },
      { group: 'ui', tools: ['open_view'] },
    ]

    expect(toolGroupsForMcpCapability(groups, 'external-mcp')).toEqual([
      { group: 'projects', tools: ['get_projects'] },
    ])
  })
})
