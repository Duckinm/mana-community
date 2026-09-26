import { describe, expect, it } from 'bun:test'
import { projectTools } from '@api/utils/mcp-tools/projects'

function tool(name: string) {
  const found = projectTools.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Missing ${name}`)
  return found
}

describe('MCP task label contract', () => {
  it('advertises label assignment and the canonical priority vocabulary', () => {
    const create = tool('create_task')
    const update = tool('update_task')

    expect(create.input_schema).toMatchObject({
      properties: {
        priority: { enum: ['low', 'med', 'high'] },
        labelIds: { type: 'array', items: { type: 'string' } },
      },
    })
    expect(update.input_schema).toMatchObject({
      properties: {
        labelIds: { type: 'array', items: { type: 'string' } },
      },
    })
  })
})
