export type DisplayRow = {
  entity: 'contact' | 'project' | 'document' | 'task' | 'transaction' | 'template'
  id: string
  title: string
  subtitle?: string
  value?: string
  badge?: string
  projectId?: string
}

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null
}

function hasError(row: Json): boolean {
  return 'error' in row || row.found === false
}

function joinSubtitle(parts: (string | undefined)[]): string | undefined {
  const joined = parts.filter((part): part is string => Boolean(part)).join(' · ')
  return joined || undefined
}

function formatMoney(amount: number, currency?: string): string {
  const formatted = amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currency ? `${formatted} ${currency}` : formatted
}

function rowsFromMany(result: unknown, build: (row: Json) => DisplayRow | null): DisplayRow[] | null {
  if (!Array.isArray(result)) return null
  return result.filter(isRecord).map(build).filter((row): row is DisplayRow => row !== null)
}

function rowFromOne(result: unknown, build: (row: Json) => DisplayRow | null): DisplayRow[] | null {
  if (!isRecord(result)) return null
  const row = build(result)
  return row ? [row] : null
}

function contactRow(row: Json): DisplayRow | null {
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null
  const company = typeof row.company === 'string' ? row.company : undefined
  const role = typeof row.role === 'string' ? row.role : undefined
  return {
    entity: 'contact',
    id: row.id,
    title: row.name,
    subtitle: joinSubtitle([company, role]),
  }
}

function summarizeContactRows(result: unknown): DisplayRow[] | null {
  if (!isRecord(result) || !isRecord(result.contact)) return null
  return rowFromOne(result.contact, contactRow)
}

function projectRow(row: Json): DisplayRow | null {
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null
  const client = typeof row.client === 'string' ? row.client : undefined
  const dueDate = typeof row.dueDate === 'string' ? row.dueDate : undefined
  return {
    entity: 'project',
    id: row.id,
    title: row.name,
    subtitle: joinSubtitle([client, dueDate]),
  }
}

function documentRow(row: Json): DisplayRow | null {
  if (typeof row.id !== 'string') return null
  const currency = typeof row.currency === 'string' ? row.currency : undefined
  return {
    entity: 'document',
    id: row.id,
    title: typeof row.number === 'string' && row.number ? row.number : row.id,
    value: typeof row.amountDue === 'number' ? formatMoney(row.amountDue, currency) : undefined,
    badge: row.isOverdue === true ? 'overdue' : typeof row.status === 'string' ? row.status : undefined,
  }
}

function taskRow(row: Json): DisplayRow | null {
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null
  return {
    entity: 'task',
    id: row.id,
    title: row.title,
    badge: typeof row.status === 'string' ? row.status : undefined,
    projectId: typeof row.projectId === 'string' ? row.projectId : undefined,
  }
}

function tasksByStatusRows(result: unknown): DisplayRow[] | null {
  if (!isRecord(result)) return null
  const rows: DisplayRow[] = []
  for (const bucket of Object.values(result)) {
    if (!Array.isArray(bucket)) continue
    for (const item of bucket) {
      if (!isRecord(item)) continue
      const row = taskRow(item)
      if (row) rows.push(row)
    }
  }
  return rows
}

function transactionRow(row: Json): DisplayRow | null {
  if (typeof row.id !== 'string' || typeof row.amount !== 'number') return null
  const currency = typeof row.currency === 'string' ? row.currency : undefined
  const sign = row.type === 'expense' ? '-' : '+'
  return {
    entity: 'transaction',
    id: row.id,
    title: typeof row.description === 'string' && row.description ? row.description : row.id,
    subtitle: typeof row.category === 'string' ? row.category : undefined,
    value: `${sign}${formatMoney(Math.abs(row.amount), currency)}`,
    badge: typeof row.status === 'string' ? row.status : undefined,
  }
}

function templateRow(row: Json, subtitle?: string): DisplayRow | null {
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null
  const currency = typeof row.currency === 'string' ? row.currency : undefined
  const cents = typeof row.defaultUnitPriceCents === 'number' ? row.defaultUnitPriceCents : undefined
  return {
    entity: 'template',
    id: row.id,
    title: row.name,
    subtitle,
    value: cents !== undefined ? formatMoney(cents / 100, currency) : undefined,
  }
}

function templateGroupRows(result: unknown): DisplayRow[] | null {
  if (!Array.isArray(result)) return null
  const rows: DisplayRow[] = []
  for (const group of result) {
    if (!isRecord(group) || !Array.isArray(group.templates)) continue
    const groupName = typeof group.name === 'string' ? group.name : undefined
    for (const template of group.templates) {
      if (!isRecord(template)) continue
      const row = templateRow(template, groupName)
      if (row) rows.push(row)
    }
  }
  return rows
}

/**
 * Single place a future MCP tool registers UI: map tool name -> row builder.
 * Tools not listed here keep their bespoke frontend widget (e.g. get_financial_summary,
 * get_dashboard_snapshot, get_storage_summary).
 */
const DISPLAY_BUILDERS: Record<string, (result: unknown) => DisplayRow[] | null> = {
  get_contact: (r) => rowFromOne(r, contactRow),
  create_contact: (r) => rowFromOne(r, contactRow),
  update_contact: (r) => rowFromOne(r, contactRow),
  get_contacts: (r) => rowsFromMany(r, contactRow),
  search_contacts: (r) => rowsFromMany(r, contactRow),
  summarize_contact: summarizeContactRows,

  get_project: (r) => rowFromOne(r, projectRow),
  create_project: (r) => rowFromOne(r, projectRow),
  update_project: (r) => rowFromOne(r, projectRow),
  get_projects: (r) => rowsFromMany(r, projectRow),

  get_unpaid_invoices: (r) => rowsFromMany(r, documentRow),
  get_overdue_invoices: (r) => rowsFromMany(r, documentRow),
  create_document: (r) => rowFromOne(r, documentRow),

  create_task: (r) => rowFromOne(r, taskRow),
  update_task: (r) => rowFromOne(r, taskRow),
  get_tasks: (r) => rowsFromMany(r, taskRow),
  get_overdue_tasks: (r) => rowsFromMany(r, taskRow),
  get_tasks_due_this_week: (r) => rowsFromMany(r, taskRow),
  get_tasks_by_status: tasksByStatusRows,

  create_transaction: (r) => rowFromOne(r, transactionRow),
  update_transaction: (r) => rowFromOne(r, transactionRow),
  get_transaction: (r) => rowFromOne(r, transactionRow),
  get_transactions: (r) => rowsFromMany(r, transactionRow),

  get_item_templates: (r) => rowsFromMany(r, (row) => templateRow(row)),
  get_item_template_groups: templateGroupRows,
}

export function displayRowsFor(toolName: string, result: unknown): DisplayRow[] | null {
  const builder = DISPLAY_BUILDERS[toolName]
  if (!builder) return null
  if (!Array.isArray(result) && isRecord(result) && hasError(result)) return null
  return builder(result)
}
