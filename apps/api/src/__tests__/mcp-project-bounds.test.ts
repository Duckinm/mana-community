import { afterAll, describe, expect, it } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { projects, tasks, users } from '@mana/db'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.userId, createdUserIds))
  const projectIds = projectRows.map((project) => project.id)
  if (projectIds.length > 0) await db.delete(tasks).where(inArray(tasks.projectId, projectIds))
  await db.delete(projects).where(inArray(projects.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'MCP bounds test', email: `mcp-bounds-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

async function createProject(userId: string, name: string) {
  const [project] = await db.insert(projects).values({ userId, name }).returning()
  return project
}

describe('bounded external project MCP reads', () => {
  it('returns bounded project summaries externally without changing in-app project context', async () => {
    const user = await createUser()
    const first = await createProject(user.id, 'First')
    const second = await createProject(user.id, 'Second')
    const third = await createProject(user.id, 'Third')
    await executeToolCall(user.id, 'create_task', { projectId: first.id, title: 'First task' })
    await executeToolCall(user.id, 'create_task', { projectId: second.id, title: 'Second task' })
    await executeToolCall(user.id, 'create_task', { projectId: third.id, title: 'Third task' })

    const chat = await executeToolCall(user.id, 'get_projects', { limit: 1 }) as { tasks: unknown[] }[]
    expect(chat).toHaveLength(3)
    expect(chat.every((project) => Array.isArray(project.tasks))).toBe(true)

    const external = await executeToolCall(user.id, 'get_projects', { limit: 2 }, { source: 'external-mcp' }) as {
      items: { taskCount: number; tasks?: unknown[] }[]
      limit: number
      hasMore: boolean
    }
    expect(external).toMatchObject({ limit: 2, hasMore: true })
    expect(external.items).toHaveLength(2)
    expect(external.items.every((project) => project.taskCount === 1 && project.tasks === undefined)).toBe(true)

    const defaultLimit = await executeToolCall(user.id, 'get_projects', {}, { source: 'external-mcp' }) as {
      limit: number
    }
    expect(defaultLimit.limit).toBe(50)
  })

  it('bounds and filters external task reads without changing in-app task context', async () => {
    const user = await createUser()
    const project = await createProject(user.id, 'Task filter project')
    await executeToolCall(user.id, 'create_task', {
      projectId: project.id,
      title: 'Past todo',
      priority: 'low',
      due: '2026-08-01',
    })
    await executeToolCall(user.id, 'create_task', {
      projectId: project.id,
      title: 'In progress',
      status: 'in-progress',
      priority: 'high',
      due: '2026-08-05',
    })
    await executeToolCall(user.id, 'create_task', {
      projectId: project.id,
      title: 'Done',
      status: 'done',
      priority: 'med',
      due: '2026-08-10',
    })

    const chat = await executeToolCall(user.id, 'get_tasks', { limit: 1 }) as unknown[]
    expect(chat).toHaveLength(3)

    const chatProject = await executeToolCall(user.id, 'get_project', {
      projectId: project.id,
      limit: 1,
    }) as { tasks: unknown[] }
    expect(chatProject.tasks).toHaveLength(3)

    const external = await executeToolCall(user.id, 'get_tasks', { limit: 2 }, { source: 'external-mcp' }) as {
      items: unknown[]
      limit: number
      hasMore: boolean
    }
    expect(external).toMatchObject({ limit: 2, hasMore: true })
    expect(external.items).toHaveLength(2)

    const externalProject = await executeToolCall(user.id, 'get_project', {
      projectId: project.id,
      limit: 2,
    }, { source: 'external-mcp' }) as {
      tasks: { items: unknown[]; limit: number; hasMore: boolean }
    }
    expect(externalProject.tasks).toMatchObject({ limit: 2, hasMore: true })
    expect(externalProject.tasks.items).toHaveLength(2)

    const filtered = await executeToolCall(user.id, 'get_tasks', {
      status: 'in-progress',
      priority: 'high',
      dueAfter: '2026-08-05',
      dueBefore: '2026-08-05',
    }, { source: 'external-mcp' }) as {
      items: { title: string }[]
      limit: number
      hasMore: boolean
    }
    expect(filtered).toMatchObject({ limit: 50, hasMore: false, items: [{ title: 'In progress' }] })

    await expect(executeToolCall(user.id, 'get_tasks', { limit: 101 }, { source: 'external-mcp' }))
      .rejects.toThrow('limit must be an integer from 1 to 100')
  })
})
