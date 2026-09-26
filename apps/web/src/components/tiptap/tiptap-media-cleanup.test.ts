import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Editor, Node } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { MediaCleanup } from './tiptap-media-cleanup'
import { deleteEditorMedia, restoreEditorMedia } from './tiptap-media-upload'

vi.mock('./tiptap-media-upload', () => ({
  deleteEditorMedia: vi.fn().mockResolvedValue(undefined),
  restoreEditorMedia: vi.fn().mockResolvedValue(undefined),
}))

const TestImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  addAttributes() {
    return { fileId: { default: null }, src: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'img' }]
  },
  renderHTML() {
    return ['img']
  },
})

function createEditor() {
  return new Editor({
    extensions: [StarterKit, TestImage, MediaCleanup],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
  })
}

function insertImage(editor: Editor, fileId: string) {
  editor.commands.insertContent({ type: 'image', attrs: { fileId, src: 'blob:x' } })
  // history groups transactions by time (newGroupDelay); split the group so undo
  // reverts only the delete, not the insert
  vi.advanceTimersByTime(600)
}

function deleteAll(editor: Editor) {
  editor.commands.deleteRange({ from: 0, to: editor.state.doc.content.size })
}

describe('MediaCleanup', () => {
  let editor: Editor

  beforeEach(() => {
    vi.useFakeTimers()
    editor = createEditor()
  })

  afterEach(() => {
    editor.destroy()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('undo within the grace period cancels the delete and calls no API', () => {
    insertImage(editor, 'f1')
    deleteAll(editor)
    editor.commands.undo()
    vi.advanceTimersByTime(10_000)

    expect(deleteEditorMedia).not.toHaveBeenCalled()
    expect(restoreEditorMedia).not.toHaveBeenCalled()
  })

  it('deletes on the server once the grace period elapses', () => {
    insertImage(editor, 'f1')
    deleteAll(editor)
    vi.advanceTimersByTime(6_000)

    expect(deleteEditorMedia).toHaveBeenCalledTimes(1)
    expect(deleteEditorMedia).toHaveBeenCalledWith('f1')
    expect(restoreEditorMedia).not.toHaveBeenCalled()
  })

  it('undo after the grace period restores the server-deleted file', () => {
    insertImage(editor, 'f1')
    deleteAll(editor)
    vi.advanceTimersByTime(6_000)
    editor.commands.undo()

    expect(deleteEditorMedia).toHaveBeenCalledTimes(1)
    expect(restoreEditorMedia).toHaveBeenCalledTimes(1)
    expect(restoreEditorMedia).toHaveBeenCalledWith('f1')
  })

  it('delete → undo → delete again schedules a fresh server delete', () => {
    insertImage(editor, 'f1')
    deleteAll(editor)
    vi.advanceTimersByTime(6_000)
    editor.commands.undo()
    editor.commands.redo()
    vi.advanceTimersByTime(6_000)

    expect(restoreEditorMedia).toHaveBeenCalledTimes(1)
    expect(deleteEditorMedia).toHaveBeenCalledTimes(2)
  })
})
