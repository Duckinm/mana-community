import { TIPTAP_EXTENSIONS, createEmptyTiptapDoc } from '@/components/tiptap/tiptap-editor-kit'
import { SlashCommand, createDefaultSlashItems } from '@/components/tiptap/tiptap-slash-command'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { normalizeTiptapDoc, type TiptapDoc } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'

export function ProjectDescriptionEditor({
  value,
  onChange,
  placeholder,
  projectId,
  className,
  debounceMs = 400,
}: {
  value: TiptapDoc | null
  onChange: (doc: TiptapDoc | null) => void
  placeholder: string
  projectId?: string
  className?: string
  debounceMs?: number
}) {
  const debounced = useDebouncedCallback(onChange, debounceMs)
  const emit = debounceMs > 0 ? debounced : onChange

  const editor = useEditor(
    {
      extensions: [
        ...TIPTAP_EXTENSIONS,
        SlashCommand.configure({
          items: createDefaultSlashItems(
            projectId ? { entityType: 'project', entityId: projectId } : undefined,
          ),
        }),
        Placeholder.configure({ placeholder }),
      ],
      content: value ?? createEmptyTiptapDoc(),
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => emit(normalizeTiptapDoc(ed.getJSON() as TiptapDoc)),
    },
    [projectId],
  )

  return (
    <EditorContent
      editor={editor}
      className={cn('notes-editor-wrap w-full font-sans text-sm', className)}
    />
  )
}
