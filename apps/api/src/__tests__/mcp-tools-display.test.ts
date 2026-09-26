import { describe, expect, it } from 'bun:test'
import { displayRowsFor } from '@api/utils/mcp-tools/display'

describe('displayRowsFor', () => {
  it('builds contact rows from a contact list', () => {
    const rows = displayRowsFor('get_contacts', [
      { id: 'c1', name: 'Ada Lovelace', company: 'Analytical Engines', role: 'Engineer' },
      { id: 'c2', name: 'Grace Hopper', company: null, role: undefined },
    ])

    expect(rows).toEqual([
      { entity: 'contact', id: 'c1', title: 'Ada Lovelace', subtitle: 'Analytical Engines · Engineer' },
      { entity: 'contact', id: 'c2', title: 'Grace Hopper', subtitle: undefined },
    ])
  })

  it('flattens get_tasks_by_status buckets into task rows', () => {
    const rows = displayRowsFor('get_tasks_by_status', {
      todo: [{ id: 't1', title: 'Write proposal', status: 'todo', projectId: 'p1' }],
      'in-progress': [{ id: 't2', title: 'Build widget', status: 'in-progress', projectId: 'p1' }],
      done: [],
      canceled: [],
    })

    expect(rows).toEqual([
      { entity: 'task', id: 't1', title: 'Write proposal', badge: 'todo', projectId: 'p1' },
      { entity: 'task', id: 't2', title: 'Build widget', badge: 'in-progress', projectId: 'p1' },
    ])
  })

  it('returns null for a tool result carrying an error', () => {
    expect(displayRowsFor('get_contact', { error: 'boom' })).toBeNull()
  })

  it('returns null for a tool result with found === false', () => {
    expect(displayRowsFor('get_project', { found: false, message: 'Project not found' })).toBeNull()
  })

  it('returns null for an unregistered tool', () => {
    expect(displayRowsFor('get_dashboard_snapshot', { anything: true })).toBeNull()
  })
})
