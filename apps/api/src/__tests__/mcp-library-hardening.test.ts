import { afterAll, describe, expect, it } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { itemTemplateGroupMembers, itemTemplateGroups, itemTemplates, remarkTemplates, users } from '@mana/db'
import { db } from '@api/db'
import { listOwnedItemTemplateGroupMembers, requireOwnedItemTemplateIds } from '@api/modules/item-template-groups/service'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

async function createUser(name: string) {
  const [user] = await db.insert(users).values({
    name,
    email: `mcp-library-${crypto.randomUUID()}@example.com`,
  }).returning()
  createdUserIds.push(user.id)
  return user
}

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('MCP library hardening', () => {
  it('rejects foreign template membership and never reads legacy foreign group members', async () => {
    const owner = await createUser('MCP library owner')
    const other = await createUser('MCP library other owner')
    const [ownedTemplate] = await db.insert(itemTemplates).values({
      userId: owner.id,
      name: 'Owned service',
    }).returning()
    const [foreignTemplate] = await db.insert(itemTemplates).values({
      userId: other.id,
      name: 'Foreign service',
    }).returning()
    const external = { source: 'external-mcp' as const }

    await expect(executeToolCall(owner.id, 'create_item_template_group', {
      name: 'Invalid package',
      templateIds: [foreignTemplate.id],
    }, external)).rejects.toThrow('Every item template must belong to you')
    expect(await db.select({ id: itemTemplateGroups.id }).from(itemTemplateGroups)
      .where(eq(itemTemplateGroups.userId, owner.id))).toEqual([])

    const [group] = await db.insert(itemTemplateGroups).values({
      userId: owner.id,
      name: 'Existing package',
    }).returning()
    await db.insert(itemTemplateGroupMembers).values([
      { groupId: group.id, templateId: ownedTemplate.id, position: 0 },
      { groupId: group.id, templateId: foreignTemplate.id, position: 1 },
    ])

    await expect(requireOwnedItemTemplateIds(owner.id, [foreignTemplate.id]))
      .rejects.toThrow('Every item template must belong to you')
    await expect(executeToolCall(owner.id, 'add_templates_to_group', {
      groupId: group.id,
      templateIds: [foreignTemplate.id],
    }, external)).rejects.toThrow('Every item template must belong to you')

    const sharedMembers = await listOwnedItemTemplateGroupMembers(owner.id, [group.id])
    expect(sharedMembers.map((member) => member.id)).toEqual([ownedTemplate.id])

    const externalGroups = await executeToolCall(owner.id, 'get_item_template_groups', { limit: 1 }, external) as {
      items: { id: string; templates: { id: string }[]; templatesLimit: number; templatesHasMore: boolean }[]
      limit: number
      hasMore: boolean
    }
    expect(externalGroups).toMatchObject({ limit: 1, hasMore: false })
    expect(externalGroups.items).toMatchObject([{
      id: group.id,
      templates: [{ id: ownedTemplate.id }],
      templatesLimit: 10,
      templatesHasMore: false,
    }])
    expect(JSON.stringify(externalGroups)).not.toContain(foreignTemplate.id)

    const chatGroups = await executeToolCall(owner.id, 'get_item_template_groups', {}, { source: 'chat' }) as {
      id: string
      templates: { id: string }[]
    }[]
    expect(chatGroups.find((result) => result.id === group.id)?.templates.map((template) => template.id))
      .toEqual([ownedTemplate.id])
  })

  it('returns bounded external pages for item and remark templates', async () => {
    const user = await createUser('MCP bounded library')
    await db.insert(itemTemplates).values([
      { userId: user.id, name: 'First template', position: 0 },
      { userId: user.id, name: 'Second template', position: 1 },
    ])
    await db.insert(remarkTemplates).values([
      { userId: user.id, name: 'First remark', position: 0 },
      { userId: user.id, name: 'Second remark', position: 1 },
    ])
    const external = { source: 'external-mcp' as const }

    const templates = await executeToolCall(user.id, 'get_item_templates', { limit: 1 }, external) as {
      items: Record<string, unknown>[]
      limit: number
      hasMore: boolean
    }
    const remarks = await executeToolCall(user.id, 'get_remark_templates', { limit: 1 }, external) as {
      items: Record<string, unknown>[]
      limit: number
      hasMore: boolean
    }

    expect(templates).toMatchObject({ limit: 1, hasMore: true })
    expect(templates.items).toHaveLength(1)
    expect(templates.items[0]).not.toHaveProperty('userId')
    expect(remarks).toMatchObject({ limit: 1, hasMore: true })
    expect(remarks.items).toHaveLength(1)
    expect(remarks.items[0]).not.toHaveProperty('userId')
  })
})
