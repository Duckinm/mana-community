import { useEffect, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { menuContent, menuItem, menuItemDestructive } from '@/components/ui/menu-styles'

export type CalendarContextMenuItem = {
  key: string
  label: string
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  danger?: boolean
  onSelect: () => void
}

type CalendarContextMenuProps = {
  open: boolean
  x: number
  y: number
  items: CalendarContextMenuItem[]
  onClose: () => void
}

export function CalendarContextMenu({
  open,
  x,
  y,
  items,
  onClose,
}: CalendarContextMenuProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault()
          onClose()
        }}
      />
      <div
        role="menu"
        className={cn(
          'fixed z-50 animate-in fade-in-0 zoom-in-[0.98] duration-150 ease-spring',
          menuContent,
        )}
        style={{ left: x, top: y }}
      >
        {items.map(({ key, label, icon: Icon, danger, onSelect }) => (
          <button
            key={key}
            type="button"
            role="menuitem"
            className={cn(
              menuItem,
              'w-full',
              danger && menuItemDestructive,
            )}
            onClick={() => {
              onSelect()
              onClose()
            }}
          >
            {Icon ? <Icon size={16} strokeWidth={2} /> : null}
            {label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
