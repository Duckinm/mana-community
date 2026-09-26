import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useResolvedMediaUrl } from './use-resolved-media-url'

export function FileNodeView({ node }: NodeViewProps) {
  const name = node.attrs.name as string | null
  const src = useResolvedMediaUrl(node.attrs.fileId as string | null, node.attrs.src as string | null)

  return (
    <NodeViewWrapper data-type="file" as="span">
      <a href={src ?? undefined} target="_blank" rel="noopener noreferrer" download={name ?? undefined} data-file="">
        {name ?? src ?? 'File'}
      </a>
    </NodeViewWrapper>
  )
}
