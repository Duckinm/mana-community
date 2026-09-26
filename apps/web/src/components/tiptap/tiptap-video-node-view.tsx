import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useResolvedMediaUrl } from './use-resolved-media-url'

export function VideoNodeView({ node }: NodeViewProps) {
  const src = useResolvedMediaUrl(node.attrs.fileId as string | null, node.attrs.src as string | null)

  return (
    <NodeViewWrapper data-type="video" className="my-2">
      <video src={src ?? undefined} controls className="max-w-full rounded-[var(--radius)]" />
    </NodeViewWrapper>
  )
}
