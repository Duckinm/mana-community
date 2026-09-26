export type ChatUiOverlay =
  | { entity: 'contact'; id: string }
  | { entity: 'project'; id: string }
  | { entity: 'document'; id: string }
  | { entity: 'task'; id: string; projectId: string }
  | { entity: 'transaction'; id: string }

export function parseChatUiAction(event: Record<string, unknown>): ChatUiOverlay | null {
  if (event.action !== 'open_overlay') return null
  const entity = event.entity
  const id = event.id
  if (typeof id !== 'string') return null

  if (entity === 'task') {
    if (typeof event.projectId !== 'string') return null
    return { entity: 'task', id, projectId: event.projectId }
  }
  if (entity === 'contact' || entity === 'project' || entity === 'document' || entity === 'transaction') {
    return { entity, id }
  }
  return null
}
