import { afterAll, describe, expect, it } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { labels, users } from '@mana/db'
import { db } from '@api/db'
import { executeToolCall, mcpToolNames } from '@api/utils/mcp-tools'
import { isMcpToolAllowed } from '@api/utils/mcp-tools/capabilities'
import { externalMcpToolDefinitions } from '@api/modules/mcp/service'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(labels).where(inArray(labels.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createUser(name: string) {
  const [user] = await db
    .insert(users)
    .values({ name, email: `mcp-label-tools-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

describe('MCP label tools', () => {
  it('lists, creates, updates, and deletes labels for the current user', async () => {
    const user = await createUser('Label tools owner')

    expect(await executeToolCall(user.id, 'get_labels', {})).toEqual([])

    const created = await executeToolCall(user.id, 'create_label', {
      name: '  Urgent  ',
      color: 'var(--danger)',
    }) as { id: string; name: string; color: string }

    expect(created).toMatchObject({ name: 'Urgent', color: 'var(--danger)' })
    expect(await executeToolCall(user.id, 'get_labels', {})).toEqual([created])

    const updated = await executeToolCall(user.id, 'update_label', {
      labelId: created.id,
      name: 'Client review',
      color: 'var(--warning)',
    }) as { id: string; name: string; color: string }

    expect(updated).toEqual({ id: created.id, name: 'Client review', color: 'var(--warning)' })
    expect(await executeToolCall(user.id, 'delete_label', { labelId: created.id })).toEqual({
      deleted: true,
      id: created.id,
    })
    expect(await db.select().from(labels).where(eq(labels.id, created.id))).toEqual([])
  })

  it('keeps labels scoped to their owner and exposes only the intended external tools', async () => {
    const owner = await createUser('Label owner')
    const other = await createUser('Other user')
    const label = await executeToolCall(owner.id, 'create_label', { name: 'Private label' }) as { id: string }

    expect(await executeToolCall(other.id, 'update_label', {
      labelId: label.id,
      name: 'Attempted overwrite',
    })).toEqual({ updated: false, message: 'Label not found' })

    expect(isMcpToolAllowed('external-mcp', 'get_labels')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'create_label')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'update_label')).toBe(true)
    expect(isMcpToolAllowed('external-mcp', 'delete_label')).toBe(false)
    expect(mcpToolNames.has('delete_label')).toBe(true)
    const labelToolNames = new Set(['create_label', 'get_labels', 'update_label'])
    expect(externalMcpToolDefinitions.filter((tool) => labelToolNames.has(tool.name)).map((tool) => tool.name).sort())
      .toEqual(['create_label', 'get_labels', 'update_label'])
  })
})
