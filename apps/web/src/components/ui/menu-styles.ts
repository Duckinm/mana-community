import { cn } from '@/lib/utils'

export const menuMotion =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 duration-150 ease-spring'

/** Canonical floating menu surface — use for dropdown, context, select, popover menus. */
export const menuSurface =
  'min-w-[12rem] rounded-xl border border-border-subtle bg-surface-overlay text-foreground shadow-popup'

export const menuContent = cn(menuSurface, 'overflow-hidden p-1')

/** Bottom drawer treatment for menus below the xl breakpoint. */
export const menuDrawer = cn(
  'menu-drawer-position',
  'max-xl:border-x-0 max-xl:border-b-0 max-xl:pb-[env(safe-area-inset-bottom)] max-xl:shadow-modal',
)

const menuItemBase =
  'relative flex cursor-default select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-[background-color,color] duration-fast ease-out data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'

export const menuItem = cn(
  menuItemBase,
  'text-foreground hover:bg-accent hover:text-accent-foreground hover:[&_svg]:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:[&_svg]:text-accent-foreground',
)

export const menuSubTrigger = cn(
  menuItem,
  'data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
)

export const menuCheckboxItem = cn(
  menuItemBase,
  'py-2 pl-8 pr-2.5 text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:[&_svg]:text-accent-foreground',
)

export const menuRadioItem = menuCheckboxItem

export const menuLabel = 'px-2.5 py-2 text-xs font-medium text-muted-foreground'

export const menuItemDestructive =
  'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:text-destructive/80 data-[highlighted]:[&_svg]:text-destructive'

export const menuSubContent = cn(menuContent, 'w-max min-w-[12rem]')

export const menuSeparator = 'mx-1 my-1 h-px bg-border-subtle'

export const menuList = 'flex flex-col gap-0.5 p-1'
