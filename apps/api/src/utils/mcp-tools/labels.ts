import { createLabel, deleteLabel, listLabels, patchLabel } from '@api/modules/labels/service'

type McpToolHandler = (userId: string, args: Record<string, unknown>) => Promise<unknown>

function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string') throw new Error(`${key} is required`)
  return value
}

export const labelTools = [
  {
    name: 'get_labels',
    description: 'List your reusable task labels with the IDs needed to apply them to a task.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_label',
    description: 'Create a reusable task label. Use the returned ID in create_task or update_task labelIds.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', minLength: 1 },
        color: { type: 'string', description: 'Optional CSS color value, such as var(--primary).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_label',
    description: 'Rename or recolor one of your reusable task labels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        labelId: { type: 'string' },
        name: { type: 'string', minLength: 1 },
        color: { type: 'string', description: 'CSS color value.' },
      },
      required: ['labelId'],
      anyOf: [{ required: ['name'] }, { required: ['color'] }],
    },
  },
  {
    name: 'delete_label',
    description: 'Delete one of your reusable task labels. Existing tasks keep their work; the deleted label is simply no longer shown.',
    input_schema: {
      type: 'object' as const,
      properties: { labelId: { type: 'string' } },
      required: ['labelId'],
    },
  },
] as const

export const labelHandlers: Record<string, McpToolHandler> = {
  'get_labels': (userId) => listLabels(userId),
  'create_label': (userId, args) => createLabel(userId, {
    name: requiredString(args, 'name'),
    color: typeof args.color === 'string' ? args.color : undefined,
  }),
  'update_label': async (userId, args) => {
    if (typeof args.name !== 'string' && typeof args.color !== 'string') {
      throw new Error('update_label requires name or color')
    }
    const updated = await patchLabel(userId, requiredString(args, 'labelId'), {
      name: typeof args.name === 'string' ? args.name : undefined,
      color: typeof args.color === 'string' ? args.color : undefined,
    })
    return updated ?? { updated: false, message: 'Label not found' }
  },
  'delete_label': async (userId, args) => {
    const deleted = await deleteLabel(userId, requiredString(args, 'labelId'))
    return deleted ? { deleted: true, id: deleted.id } : { deleted: false, message: 'Label not found' }
  },
}
