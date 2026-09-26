import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useResolvedMediaUrl } from './use-resolved-media-url'

export function ImageNodeView({ node }: NodeViewProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const alt = node.attrs.alt as string | null
  const src = useResolvedMediaUrl(node.attrs.fileId as string | null, node.attrs.src as string | null)

  return (
    <NodeViewWrapper data-type="image" className="relative my-2 inline-block max-w-full">
      <img
        src={src ?? undefined}
        alt={alt ?? ''}
        className="max-h-[480px] max-w-full cursor-zoom-in rounded-[var(--radius)] object-contain"
        onClick={() => setPreviewOpen(true)}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          disableDrawer
          className="max-w-2xl border-none bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">{alt ?? 'Image preview'}</DialogTitle>
          <div
            className="w-full flex items-center justify-center rounded-xl overflow-hidden"
            style={{
              background: 'repeating-conic-gradient(var(--border-subtle) 0% 25%, transparent 0% 50%)',
              backgroundSize: '20px 20px',
              minHeight: 320,
            }}
          >
            <img src={src ?? undefined} alt={alt ?? ''} className="max-w-full max-h-[60vh] object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  )
}
