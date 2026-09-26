import { Highlight } from '@tiptap/extension-highlight'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { StarterKit } from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/react'
import { Callout, FileBlock, Image, Video } from './tiptap-custom-nodes'
import { MediaCleanup } from './tiptap-media-cleanup'

// Tiptap's heading node has one name with a `level` attribute (1-3), not separate node types
export const TIPTAP_SLASH_TEXT_IDS = new Set(['paragraph', 'heading'])
export const TIPTAP_SLASH_LIST_IDS = new Set(['bulletList', 'orderedList', 'taskList'])
export const TIPTAP_SLASH_LAYOUT_IDS = new Set([
  'blockquote',
  'callout',
  'codeBlock',
  'table',
  'horizontalRule',
])
export const TIPTAP_SLASH_MEDIA_IDS = new Set(['image', 'video', 'file'])
export const TIPTAP_SLASH_INLINE_IDS = new Set(['link'])

export const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    link: { openOnClick: false },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  Highlight,
  Image,
  Callout,
  Video,
  FileBlock,
  MediaCleanup,
]

export function createEmptyTiptapDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}
