import { afterAll, describe, expect, it } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { labels, projects, tasks, users } from '@mana/db'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.userId, createdUserIds))
  const projectIds = projectRows.map((row) => row.id)
  if (projectIds.length > 0) await db.delete(tasks).where(inArray(tasks.projectId, projectIds))
  await db.delete(labels).where(inArray(labels.userId, createdUserIds))
  await db.delete(projects).where(inArray(projects.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createFixture() {
  const [user] = await db
    .insert(users)
    .values({ name: 'MCP labels test', email: `mcp-labels-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  const [project] = await db
    .insert(projects)
    .values({ userId: user.id, name: 'Labels parity project' })
    .returning()
  const [urgent, design] = await db
    .insert(labels)
    .values([
      { userId: user.id, name: 'Urgent', color: '#E5484D' },
      { userId: user.id, name: 'Design', color: '#0EA5E9' },
    ])
    .returning()
  return { user, project, urgent, design }
}

describe('MCP task labels', () => {
  it('creates and updates task labels through the same task command as the UI', async () => {
    const { user, project, urgent, design } = await createFixture()

    const created = await executeToolCall(user.id, 'create_task', {
      projectId: project.id,
      title: 'Design the proposal',
      priority: 'med',
      labelIds: [urgent.id],
    }) as { id: string; priority: string; labels: { id: string; name: string; color: string }[] }

    expect(created.priority).toBe('med')
    expect(created.labels).toEqual([{ id: urgent.id, name: 'Urgent', color: '#E5484D' }])

    const updated = await executeToolCall(user.id, 'update_task', {
      taskId: created.id,
      labelIds: [design.id],
    }) as { labels: { id: string; name: string; color: string }[] }

    expect(updated.labels).toEqual([{ id: design.id, name: 'Design', color: '#0EA5E9' }])
  })

  it('rejects the non-canonical medium priority instead of persisting it', async () => {
    const { user, project } = await createFixture()

    await expect(executeToolCall(user.id, 'create_task', {
      projectId: project.id,
      title: 'Use a canonical priority',
      priority: 'medium',
    })).rejects.toThrow('priority must be one of high, med, low')
  })

  it('rejects label IDs owned by another user', async () => {
    const owner = await createFixture()
    const other = await createFixture()

    await expect(executeToolCall(owner.user.id, 'create_task', {
      projectId: owner.project.id,
      title: 'Keep labels scoped to their owner',
      labelIds: [other.urgent.id],
    })).rejects.toThrow('Every label must belong to you')
  })
})
