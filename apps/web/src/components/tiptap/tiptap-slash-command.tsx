import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionPluginKey, type SuggestionOptions } from '@tiptap/suggestion'
import type { Editor, Range } from '@tiptap/core'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  TIPTAP_SLASH_INLINE_IDS,
  TIPTAP_SLASH_LAYOUT_IDS,
  TIPTAP_SLASH_LIST_IDS,
  TIPTAP_SLASH_MEDIA_IDS,
  TIPTAP_SLASH_TEXT_IDS,
} from './tiptap-editor-kit'
import { uploadEditorMedia, type EditorUploadContext } from './tiptap-media-upload'

export type SlashItem = {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  command: (editor: Editor, range: Range) => void
}

export function createDefaultSlashItems(uploadContext?: EditorUploadContext): SlashItem[] {
  return DEFAULT_SLASH_ITEMS.map((item) => {
    if (item.id !== 'image' && item.id !== 'video' && item.id !== 'file') return item
    const accept = item.id === 'image' ? 'image/*' : item.id === 'video' ? 'video/*' : '*/*'
    return {
      ...item,
      command: (e: Editor, r: Range) => {
        e.chain().focus().deleteRange(r).run()
        uploadEditorMedia(accept, uploadContext).then((uploaded) => {
          if (!uploaded) return
          if (item.id === 'image') e.chain().focus().insertContent({ type: 'image', attrs: { src: uploaded.url, alt: uploaded.name, fileId: uploaded.id } }).run()
          if (item.id === 'video') e.chain().focus().insertContent({ type: 'video', attrs: { src: uploaded.url, fileId: uploaded.id } }).run()
          if (item.id === 'file') e.chain().focus().insertContent({ type: 'file', attrs: { src: uploaded.url, name: uploaded.name, fileId: uploaded.id } }).run()
        })
      },
    }
  })
}

export const DEFAULT_SLASH_ITEMS: SlashItem[] = [
  { id: 'paragraph', title: 'Text', command: (e, r) => e.chain().focus().deleteRange(r).setParagraph().run() },
  { id: 'heading', title: 'Heading 1', command: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 1 }).run() },
  { id: 'heading', title: 'Heading 2', command: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 2 }).run() },
  { id: 'heading', title: 'Heading 3', command: (e, r) => e.chain().focus().deleteRange(r).setNode('heading', { level: 3 }).run() },
  { id: 'bulletList', title: 'Bulleted list', command: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
  { id: 'orderedList', title: 'Numbered list', command: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
  { id: 'taskList', title: 'To-do list', command: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run() },
  { id: 'blockquote', title: 'Quote', command: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
  { id: 'callout', title: 'Callout', command: (e, r) => e.chain().focus().deleteRange(r).insertContent({ type: 'callout', content: [{ type: 'paragraph' }] }).run() },
  { id: 'codeBlock', title: 'Code block', command: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run() },
  { id: 'table', title: 'Table', command: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'horizontalRule', title: 'Divider', command: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run() },
  {
    id: 'image',
    title: 'Image',
    command: (e, r) => {
      e.chain().focus().deleteRange(r).run()
      uploadEditorMedia('image/*').then((uploaded) => {
        if (uploaded) e.chain().focus().insertContent({ type: 'image', attrs: { src: uploaded.url, alt: uploaded.name, fileId: uploaded.id } }).run()
      })
    },
  },
  {
    id: 'video',
    title: 'Video',
    command: (e, r) => {
      e.chain().focus().deleteRange(r).run()
      uploadEditorMedia('video/*').then((uploaded) => {
        if (uploaded) e.chain().focus().insertContent({ type: 'video', attrs: { src: uploaded.url, fileId: uploaded.id } }).run()
      })
    },
  },
  {
    id: 'file',
    title: 'File',
    command: (e, r) => {
      e.chain().focus().deleteRange(r).run()
      uploadEditorMedia('*/*').then((uploaded) => {
        if (uploaded) e.chain().focus().insertContent({ type: 'file', attrs: { src: uploaded.url, name: uploaded.name, fileId: uploaded.id } }).run()
      })
    },
  },
]

export type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const SlashMenu = forwardRef<SlashMenuHandle, { items: SlashItem[]; command: (item: SlashItem) => void }>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => setSelected(0), [items])

    useEffect(() => {
      itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' })
    }, [selected])

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (items.length === 0) return false
        if (event.key === 'ArrowDown') {
          setSelected((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelected((i) => (i - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          command(items[selected])
          return true
        }
        return false
      },
    }))

    const text = items.filter((i) => TIPTAP_SLASH_TEXT_IDS.has(i.id))
    const lists = items.filter((i) => TIPTAP_SLASH_LIST_IDS.has(i.id))
    const layout = items.filter((i) => TIPTAP_SLASH_LAYOUT_IDS.has(i.id))
    const media = items.filter((i) => TIPTAP_SLASH_MEDIA_IDS.has(i.id))
    const inline = items.filter((i) => TIPTAP_SLASH_INLINE_IDS.has(i.id))

    const groups: [string, SlashItem[]][] = [
      ['Text', text],
      ['Lists', lists],
      ['Layout & Structure', layout],
      ['Media & Files', media],
      ['Inline', inline],
    ]

    let flatIndex = -1

    return (
      // preventDefault keeps the editor focused through menu clicks, so typing continues after picking a block
      <Command
        className="border border-border-subtle shadow-md"
        shouldFilter={false}
        onMouseDown={(event) => event.preventDefault()}
      >
        <CommandList>
          <CommandEmpty>No blocks found</CommandEmpty>
          {groups.map(
            ([heading, groupItems]) =>
              groupItems.length > 0 && (
                <CommandGroup key={heading} heading={heading}>
                  {groupItems.map((item) => {
                    flatIndex += 1
                    const index = flatIndex
                    return (
                      <CommandItem
                        key={`${item.id}-${index}`}
                        ref={(el) => { itemRefs.current[index] = el }}
                        value={`${item.title}-${index}`}
                        data-active={index === selected}
                        className="data-[active=true]:bg-surface-raised data-[active=true]:text-foreground"
                        onMouseEnter={() => setSelected(index)}
                        onSelect={() => command(item)}
                      >
                        {item.icon}
                        <div>
                          <div>{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ),
          )}
        </CommandList>
      </Command>
    )
  },
)
SlashMenu.displayName = 'SlashMenu'

export const SlashCommand = Extension.create<{ items: SlashItem[] }>({
  name: 'slashCommand',

  addOptions() {
    return { items: DEFAULT_SLASH_ITEMS }
  },

  addProseMirrorPlugins() {
    const items = this.options.items

    const suggestion: Omit<SuggestionOptions, 'editor'> = {
      char: '/',
      startOfLine: false,
      items: ({ query }) =>
        items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
      render: () => {
        let renderer: ReactRenderer | null = null
        let unmount: (() => void) | null = null
        let removeEscapeListener: (() => void) | null = null

        return {
          onStart: (props) => {
            // Escape must close this menu, not any parent dialog. Radix dialogs listen on document
            // in capture phase (before the editor sees the key), and ProseMirror ignores keydowns
            // that are already defaultPrevented — so intercept one level earlier, on window capture,
            // and dismiss the suggestion ourselves.
            const onEscapeCapture = (event: KeyboardEvent) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              event.stopImmediatePropagation()
              const { view } = props.editor
              view.dispatch(view.state.tr.setMeta(SuggestionPluginKey, { exit: true }))
            }
            window.addEventListener('keydown', onEscapeCapture, { capture: true })
            removeEscapeListener = () =>
              window.removeEventListener('keydown', onEscapeCapture, { capture: true })
            renderer = new ReactRenderer(SlashMenu, {
              editor: props.editor,
              props: {
                items: props.items,
                command: (item: SlashItem) => item.command(props.editor, props.range),
              },
            })
            const element = renderer.element as HTMLElement
            // suggestion mounts to document.body with no z-index; must beat dialog (z-50) and popover (z-[70]) layers
            element.style.zIndex = '80'
            // modal dialogs set pointer-events:none on body — without this the menu is click-dead inside dialogs
            element.style.pointerEvents = 'auto'
            // lets DialogContent recognize menu clicks as inside interactions instead of dismissing
            element.dataset.slashMenu = 'true'
            unmount = props.mount(element)
          },
          onUpdate: (props) => {
            renderer?.updateProps({
              items: props.items,
              command: (item: SlashItem) => item.command(props.editor, props.range),
            })
          },
          onKeyDown: ({ event }) => {
            if (event.key === 'Escape') return true
            const handle = renderer?.ref as SlashMenuHandle | null
            return handle?.onKeyDown(event) ?? false
          },
          onExit: () => {
            removeEscapeListener?.()
            removeEscapeListener = null
            unmount?.()
            renderer?.destroy()
          },
        }
      },
    }

    return [Suggestion({ editor: this.editor, ...suggestion })]
  },
})
