import type { MouseEvent } from 'react'

/** Sidebar rows use inline hover fill — shared to keep picker / sub-nav in sync. */
export const sidebarRowHoverHandlers = {
  onMouseEnter: (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'var(--border-subtle)'
  },
  onMouseLeave: (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'transparent'
  },
} as const
