import {
  EmojiPicker as EmojiPickerPrimitive,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from 'frimousse'
import { Loader2, Search } from '@/components/icons'
import { cn } from '@/lib/utils'

function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn('isolate flex h-full w-fit flex-col overflow-hidden', className)}
      {...props}
    />
  )
}

function EmojiPickerSearch({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className={cn('flex h-9 items-center gap-2 border-b border-border-subtle px-3', className)}>
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <EmojiPickerPrimitive.Search
        className="flex h-9 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        placeholder="Search emoji…"
        {...props}
      />
    </div>
  )
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return <div {...props} className="scroll-my-1 px-1">{children}</div>
}

function EmojiPickerEmoji({ emoji, className, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-base transition-colors hover:bg-surface-raised data-[active]:bg-surface-raised',
        className
      )}
    >
      {emoji.emoji}
    </button>
  )
}

function EmojiPickerCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div {...props} className="bg-surface-overlay text-muted-foreground px-3 pt-3 pb-1.5 text-2xs uppercase tracking-wide font-medium">
      {category.label}
    </div>
  )
}

function EmojiPickerContent({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn('relative outline-none', className)}
      style={{ height: 220, overflowY: 'auto' }}
      {...props}
    >
      <EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="pb-1 select-none"
        components={{ Row: EmojiPickerRow, Emoji: EmojiPickerEmoji, CategoryHeader: EmojiPickerCategoryHeader }}
      />
    </EmojiPickerPrimitive.Viewport>
  )
}

function EmojiPickerFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5 border-t border-border-subtle px-3 py-2', className)} {...props}>
      <EmojiPickerPrimitive.ActiveEmoji>
        {({ emoji }) =>
          emoji ? (
            <>
              <span className="text-lg leading-none">{emoji.emoji}</span>
              <span className="text-2xs text-muted-foreground truncate">{emoji.label}</span>
            </>
          ) : (
            <span className="text-2xs text-muted-foreground">Select an emoji…</span>
          )
        }
      </EmojiPickerPrimitive.ActiveEmoji>
    </div>
  )
}

export { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch }
