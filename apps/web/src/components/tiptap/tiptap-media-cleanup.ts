import { Extension, type Editor } from '@tiptap/core'
import { deleteEditorMedia, restoreEditorMedia } from './tiptap-media-upload'

const MEDIA_NODE_TYPES = new Set(['image', 'video', 'file'])

type Doc = Editor['state']['doc']
type DescendantsCallback = Parameters<Doc['descendants']>[0]
type ProseMirrorNode = Parameters<DescendantsCallback>[0]

function collectFileIds(doc: Doc) {
  const ids = new Set<string>()
  doc.descendants((node: ProseMirrorNode) => {
    if (MEDIA_NODE_TYPES.has(node.type.name) && node.attrs.fileId) {
      ids.add(node.attrs.fileId as string)
    }
  })
  return ids
}

const UNDO_GRACE_PERIOD_MS = 5000

export const MediaCleanup = Extension.create({
  name: 'mediaCleanup',

  addStorage() {
    return {
      pendingDeletes: new Map<string, ReturnType<typeof setTimeout>>(),
      // files whose soft-delete actually reached the server (grace period elapsed)
      deletedIds: new Set<string>(),
    }
  },

  onTransaction({ transaction }) {
    if (!transaction.docChanged) return
    const pending = this.storage.pendingDeletes as Map<string, ReturnType<typeof setTimeout>>
    const deletedIds = this.storage.deletedIds as Set<string>
    const before = collectFileIds(transaction.before)
    const after = collectFileIds(transaction.doc)

    for (const id of before) {
      if (!after.has(id) && !pending.has(id) && !deletedIds.has(id)) {
        const timer = setTimeout(() => {
          pending.delete(id)
          deletedIds.add(id)
          void deleteEditorMedia(id)
        }, UNDO_GRACE_PERIOD_MS)
        pending.set(id, timer)
      }
    }

    for (const id of after) {
      // undo within the grace period: the delete never fired, so cancelling is enough
      const timer = pending.get(id)
      if (timer) {
        clearTimeout(timer)
        pending.delete(id)
        continue
      }

      // undo after the grace period: the file is in trash, bring it back
      if (deletedIds.has(id)) {
        deletedIds.delete(id)
        void restoreEditorMedia(id)
      }
    }
  },

  onDestroy() {
    const pending = this.storage.pendingDeletes as Map<string, ReturnType<typeof setTimeout>>
    const deletedIds = this.storage.deletedIds as Set<string>
    for (const timer of pending.values()) {
      clearTimeout(timer)
    }
    pending.clear()
    deletedIds.clear()
  },
})
