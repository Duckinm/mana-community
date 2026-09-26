import { TIPTAP_EXTENSIONS, createEmptyTiptapDoc } from '@/components/tiptap/tiptap-editor-kit'
import { SlashCommand, createDefaultSlashItems } from '@/components/tiptap/tiptap-slash-command'
import { normalizeTiptapDoc, type TiptapDoc } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import { Placeholder } from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'

interface Props {
  taskId: string
  body: TiptapDoc | null | undefined
  onChange: (body: TiptapDoc | null) => void
  className?: string
  placeholder?: string
}

export function TaskBodyEditor({ taskId, body, onChange, className, placeholder }: Props) {
  const editor = useEditor(
    {
      extensions: [
        ...TIPTAP_EXTENSIONS,
        Placeholder.configure({
          placeholder: placeholder ?? 'Add description…',
        }),
        SlashCommand.configure({
          items: createDefaultSlashItems({ entityType: 'task', entityId: taskId }),
        }),
      ],
      content: body ?? createEmptyTiptapDoc(),
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => onChange(normalizeTiptapDoc(ed.getJSON() as TiptapDoc)),
    },
    [taskId],
  )

  return (
    <div className={cn('notes-editor-wrap mt-4 xl:mt-6', className)}>
      <EditorContent editor={editor} className="w-full font-sans" />
    </div>
  )
}
