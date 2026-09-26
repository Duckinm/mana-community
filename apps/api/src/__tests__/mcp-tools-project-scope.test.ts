import { describe, it, expect, afterAll } from 'bun:test'
import { db } from '@api/db'
import { contacts, users, projects, tasks } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  const rows = await db.select({ id: projects.id }).from(projects).where(inArray(projects.userId, createdUserIds))
  const projectIds = rows.map((p) => p.id)
  if (projectIds.length > 0) {
    await db.delete(tasks).where(inArray(tasks.projectId, projectIds))
    await db.delete(projects).where(inArray(projects.id, projectIds))
  }
  await db.delete(contacts).where(inArray(contacts.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Scope Test', email: `scope-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

// Inserted directly: create_project enforces the free-plan cap of one active project.
async function createProject(userId: string, name: string, archived = false) {
  const [project] = await db.insert(projects).values({ userId, name, archived }).returning({ id: projects.id })
  return project
}

describe('mcp project scope', () => {
  it('hides archived projects and their tasks unless includeArchived is set', async () => {
    const user = await createUser()

    const active = await createProject(user.id, 'Active')
    const archived = await createProject(user.id, 'Archived', true)
    await executeToolCall(user.id, 'create_task', { projectId: active.id, title: 'Active task' })
    await executeToolCall(user.id, 'create_task', { projectId: archived.id, title: 'Archived task' })

    const visible = (await executeToolCall(user.id, 'get_projects', {})) as { id: string }[]
    expect(visible.map((p) => p.id)).toEqual([active.id])

    const all = (await executeToolCall(user.id, 'get_projects', { includeArchived: true })) as { id: string }[]
    expect(all.map((p) => p.id).sort()).toEqual([active.id, archived.id].sort())

    const visibleTasks = (await executeToolCall(user.id, 'get_tasks', {})) as { projectId: string }[]
    expect(visibleTasks.map((t) => t.projectId)).toEqual([active.id])

    const allTasks = (await executeToolCall(user.id, 'get_tasks', { includeArchived: true })) as {
      projectId: string
    }[]
    expect(allTasks.length).toBe(2)

    // Asking for an archived project by id still resolves it.
    const byId = (await executeToolCall(user.id, 'get_project', { projectId: archived.id })) as { id: string }
    expect(byId.id).toBe(archived.id)

    // Tasks scoped to an explicit archived project are returned too.
    const scoped = (await executeToolCall(user.id, 'get_tasks', { projectId: archived.id })) as unknown[]
    expect(scoped.length).toBe(1)
  })

  it('returns no tasks when every project is archived', async () => {
    const user = await createUser()
    const only = await createProject(user.id, 'Only')
    await executeToolCall(user.id, 'create_task', { projectId: only.id, title: 'Orphan' })
    await executeToolCall(user.id, 'archive_project', { projectId: only.id })

    expect(await executeToolCall(user.id, 'get_tasks', {})).toEqual([])
    expect(await executeToolCall(user.id, 'get_projects', {})).toEqual([])
  })

  it('cannot link another user’s contact to the caller’s project', async () => {
    const owner = await createUser()
    const other = await createUser()
    const project = await createProject(owner.id, 'Owned project')
    const [foreignContact] = await db
      .insert(contacts)
      .values({ userId: other.id, name: 'Foreign contact', initials: 'FC' })
      .returning({ id: contacts.id })

    expect(await executeToolCall(owner.id, 'link_contact_to_project', {
      projectId: project.id,
      contactId: foreignContact.id,
    })).toEqual({ success: false, message: 'Contact not found' })

    const [stored] = await db
      .select({ contactId: projects.contactId })
      .from(projects)
      .where(eq(projects.id, project.id))
    expect(stored?.contactId).toBeNull()
  })
})
