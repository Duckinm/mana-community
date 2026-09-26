import type { itemTemplates, itemTemplateGroups } from '@mana/db'
import { wireTimestamps } from '@api/lib/wire-row'

type ItemTemplateRow = typeof itemTemplates.$inferSelect
type ItemTemplateGroupRow = typeof itemTemplateGroups.$inferSelect

const TEMPLATE_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof ItemTemplateRow)[]
const GROUP_KEYS = ['createdAt', 'updatedAt'] as const satisfies readonly (keyof ItemTemplateGroupRow)[]

export function itemTemplateToWire(
  row: ItemTemplateRow,
  extras?: { imageUrl?: string | null },
) {
  return { ...wireTimestamps(row, TEMPLATE_KEYS), imageUrl: extras?.imageUrl ?? null }
}

type TemplateGroupExtras = {
  templates?: {
    id: string
    name: string
    description: string
    defaultQty: number
    defaultUnitPriceCents: number
    currency: string
    position: number
  }[]
}

export function itemTemplateGroupToWire<T extends ItemTemplateGroupRow>(
  row: T,
  extras?: TemplateGroupExtras,
) {
  return { ...wireTimestamps(row, GROUP_KEYS), templates: extras?.templates ?? [] }
}
