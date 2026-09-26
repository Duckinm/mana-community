import { TIPTAP_EXTENSIONS, createEmptyTiptapDoc } from '@/components/tiptap/tiptap-editor-kit'
import { SlashCommand, createDefaultSlashItems } from '@/components/tiptap/tiptap-slash-command'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { normalizeTiptapDoc, type TiptapDoc } from '@/lib/rich-text'
import { EditorContent, useEditor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'

interface Props {
  milestoneId: string
  description: TiptapDoc | null
  onChange: (doc: TiptapDoc | null) => void
}

export function MilestoneDescriptionEditor({ milestoneId, description, onChange }: Props) {
  const { t } = useTranslation('projects')
  const debouncedOnChange = useDebouncedCallback(onChange, 800)

  const editor = useEditor(
    {
      extensions: [
        ...TIPTAP_EXTENSIONS,
        SlashCommand.configure({
          items: createDefaultSlashItems({ entityType: 'milestone', entityId: milestoneId }),
        }),
      ],
      content: description ?? createEmptyTiptapDoc(),
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => debouncedOnChange(normalizeTiptapDoc(ed.getJSON() as TiptapDoc)),
    },
    [milestoneId],
  )

  const isEmpty = editor?.isEmpty ?? true

  return (
    <div className="notes-editor-wrap relative">
      {isEmpty && (
        <button
          type="button"
          onClick={() => editor?.chain().focus().run()}
          className="pointer-events-auto absolute left-0 top-0 text-sm text-muted-foreground"
        >
          {t('milestones.addDescription')}
        </button>
      )}
      <EditorContent editor={editor} className="w-full font-sans text-sm" />
    </div>
  )
}
