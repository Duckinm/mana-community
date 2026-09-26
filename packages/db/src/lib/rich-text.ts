/**
 * Rich text is stored as Tiptap JSON documents in `jsonb` columns.
 * Single source of truth for the document shape and text extraction —
 * both apps re-export from here (`apps/web/src/lib/rich-text.ts`,
 * `apps/api/src/lib/rich-text.ts`).
 */

export type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type TiptapNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  content?: TiptapNode[]
}

export type TiptapDoc = {
  type: 'doc'
  content?: TiptapNode[]
}

export function isTiptapDoc(value: unknown): value is TiptapDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as TiptapNode).type === 'doc' &&
    ((value as TiptapNode).content === undefined || Array.isArray((value as TiptapNode).content))
  )
}

/** Node types that carry no text but still count as content. */
const BLOCK_TYPES_ENDING_LINE = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'tableRow'])

function nodeToTextParts(node: TiptapNode, parts: string[]): void {
  if (node.type === 'text' && node.text) parts.push(node.text)
  for (const child of node.content ?? []) nodeToTextParts(child, parts)
  if (
    node.type &&
    BLOCK_TYPES_ENDING_LINE.has(node.type) &&
    parts.length > 0 &&
    parts[parts.length - 1] !== '\n'
  ) {
    parts.push('\n')
  }
}

/**
 * Notes written by the pre-Tiptap block editor were migrated as their raw JSON
 * string inside a text node, so they render as `{"id":…,"value":[…]}` blobs.
 * Recover the readable text instead of printing the blob.
 */
function unwrapLegacyEditorBlob(text: string): string {
  if (!text.startsWith('{')) return text
  let blob: unknown
  try {
    blob = JSON.parse(text)
  } catch {
    return text
  }
  if (typeof blob !== 'object' || blob === null) return text
  const blocks = Object.values(blob as Record<string, { value?: unknown }>)
  if (!blocks.length || !blocks.every((b) => Array.isArray(b?.value))) return text
  const parts: string[] = []
  const walk = (node: { text?: unknown; children?: unknown }): void => {
    if (typeof node?.text === 'string') parts.push(node.text)
    if (Array.isArray(node?.children)) for (const child of node.children) walk(child)
  }
  for (const block of blocks) {
    for (const node of block.value as Array<Record<string, unknown>>) walk(node)
    parts.push('\n')
  }
  return parts.join('').trim()
}

/** Plain text projection of a doc — for previews, markdown export, search, and AI prompts. */
export function tiptapDocToText(doc: TiptapDoc | null | undefined): string {
  if (!doc) return ''
  const parts: string[] = []
  for (const node of doc.content ?? []) nodeToTextParts(node, parts)
  return unwrapLegacyEditorBlob(parts.join('').trim())
}

/** Wrap plain text in a doc (one paragraph per line). Returns null for blank input. */
export function textToTiptapDoc(text: string): TiptapDoc | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return {
    type: 'doc',
    content: trimmed.split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      ...(line.trim() ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  }
}

function isEmptyNode(node: TiptapNode): boolean {
  if (node.type === 'text') return !node.text
  // any non-container node (image, video, file, horizontalRule, …) is content by itself
  if (node.type !== 'paragraph' && node.type !== 'doc') return false
  return (node.content ?? []).every(isEmptyNode)
}

/** True when the doc has no text and no media/structural content. */
export function isEmptyTiptapDoc(doc: TiptapDoc | null | undefined): boolean {
  if (!doc) return true
  return (doc.content ?? []).every(isEmptyNode)
}

/** Normalize an editor emission: empty documents are stored as NULL, never `{}` husks. */
export function normalizeTiptapDoc(doc: TiptapDoc | null | undefined): TiptapDoc | null {
  return isEmptyTiptapDoc(doc) ? null : (doc as TiptapDoc)
}
