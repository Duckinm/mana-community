import { describe, it, expect } from 'bun:test'
import { buildProject, parseTaskScheduledSpan, taskRowToClientDto } from '@api/modules/projects/service'
import type { labels } from '@mana/db'

const baseTask = {
  id: 'task-1',
  projectId: 'proj-1',
  userId: 'user-1',
  title: 'Write proposal',
  status: 'todo',
  priority: 'med',
  due: '',
  dueTime: null,
  scheduledStart: null,
  scheduledEnd: null,
  labelIds: '[]',
  aiAssigned: false,
  description: null,
  body: null,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
} as unknown as Parameters<typeof taskRowToClientDto>[0]

const baseProject = {
  id: 'proj-1',
  userId: 'user-1',
  name: 'Acme Rebrand',
  client: 'Acme',
  color: '#D4A843',
  objective: '',
  icon: '',
  startDate: '',
  dueDate: '',
  description: '',
  archived: false,
  labelIds: '[]',
  contactId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Parameters<typeof buildProject>[0]

describe('taskRowToClientDto', () => {
  it('maps a minimal task row to the client DTO shape', () => {
    const dto = taskRowToClientDto(baseTask, 'Acme')
    expect(dto.id).toBe('task-1')
    expect(dto.projectId).toBe('proj-1')
    expect(dto.client).toBe('Acme')
    expect(dto.status).toBe('todo')
    expect(dto.labels).toEqual([])
  })

  it('renders a null due date as null (no sentinel)', () => {
    const dto = taskRowToClientDto({ ...baseTask, due: null }, 'Acme')
    expect(dto.due).toBeNull()
  })

  it('preserves a due time independently from the due date', () => {
    const dto = taskRowToClientDto({ ...baseTask, due: '2026-08-09', dueTime: '14:30' }, 'Acme')
    expect(dto).toMatchObject({ due: '2026-08-09', dueTime: '14:30' })
  })

  it('serializes a scheduled span as ISO instants', () => {
    const dto = taskRowToClientDto({
      ...baseTask,
      scheduledStart: new Date('2026-08-09T09:00:00.000Z'),
      scheduledEnd: new Date('2026-08-09T10:00:00.000Z'),
    }, 'Acme')
    expect(dto).toMatchObject({
      scheduledStart: '2026-08-09T09:00:00.000Z',
      scheduledEnd: '2026-08-09T10:00:00.000Z',
    })
  })

  it('requires a complete, increasing scheduled span', () => {
    expect(() => parseTaskScheduledSpan({ scheduledStart: '2026-08-09T09:00:00.000Z' })).toThrow()
    expect(() => parseTaskScheduledSpan({
      scheduledStart: '2026-08-09T10:00:00.000Z',
      scheduledEnd: '2026-08-09T09:00:00.000Z',
    })).toThrow()
  })

  it('resolves task labelIds against the provided label rows', () => {
    const vipLabel = { id: 'label-1', name: 'vip', color: '#D4A843' } as unknown as typeof labels.$inferSelect
    const dto = taskRowToClientDto({ ...baseTask, labelIds: '["label-1"]' }, 'Acme', [vipLabel])
    expect(dto.labels).toEqual([{ id: 'label-1', name: 'vip', color: '#D4A843' }])
  })

  it('passes the body doc through when present', () => {
    const body = { type: 'doc' as const, content: [{ type: 'paragraph' }] }
    const dto = taskRowToClientDto({ ...baseTask, body }, 'Acme')
    expect(dto.body).toEqual(body)
  })

  it('leaves body undefined when not set', () => {
    const dto = taskRowToClientDto(baseTask, 'Acme')
    expect(dto.body).toBeUndefined()
  })
})

describe('buildProject', () => {
  it('builds one column per task status', () => {
    const project = buildProject(baseProject, [baseTask])
    expect(project.columns.length).toBeGreaterThan(0)
    const todoColumn = project.columns.find((c) => c.id === 'todo')
    expect(todoColumn?.tasks.length).toBe(1)
  })

  it('produces empty columns when there are no tasks', () => {
    const project = buildProject(baseProject, [])
    for (const column of project.columns) {
      expect(column.tasks).toEqual([])
    }
  })

  it('sorts tasks within a column by position', () => {
    const taskA = { ...baseTask, id: 'a', position: 1, title: 'Second' }
    const taskB = { ...baseTask, id: 'b', position: 0, title: 'First' }
    const project = buildProject(baseProject, [taskA, taskB])
    const todoColumn = project.columns.find((c) => c.id === 'todo')
    expect(todoColumn?.tasks.map((t) => t.title)).toEqual(['First', 'Second'])
  })

  it('resolves project labelIds against the provided label rows', () => {
    const vipLabel = { id: 'label-1', name: 'vip', color: '#D4A843' } as unknown as typeof labels.$inferSelect
    const project = buildProject({ ...baseProject, labelIds: '["label-1"]' }, [], [vipLabel])
    expect(project.labels).toEqual([{ id: 'label-1', name: 'vip', color: '#D4A843' }])
  })

  it('omits label ids that no longer resolve to a label row', () => {
    const project = buildProject({ ...baseProject, labelIds: '["missing"]' }, [])
    expect(project.labels).toEqual([])
  })
})
