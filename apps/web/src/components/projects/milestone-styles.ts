import type { Milestone } from '@/components/projects/types'

export function milestoneDiamondClass(milestone: Milestone): string {
  if (milestone.taskCount > 0 && milestone.activeCount === 0) {
    return 'text-info fill-info/30'
  }
  if (milestone.activeCount > 0) return 'text-warning fill-warning/30'
  return 'text-muted-foreground fill-muted-foreground/20'
}

export function milestoneDiamondClassMuted(): string {
  return 'text-muted-foreground fill-muted-foreground/20'
}
