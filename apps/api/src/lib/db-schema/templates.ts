import { createInsertSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { itemTemplates, itemTemplateGroups } from '@mana/db'

// defaultQty is fixed-point ×100 and quantities are whole units, so the floor
// and the step are both 100. Both columns have DB defaults, hence Optional — a
// refinement replaces the generated schema outright rather than decorating it.
const itemTemplateAmounts = {
  defaultQty: t.Optional(t.Integer({ minimum: 100, multipleOf: 100 })),
  defaultUnitPriceCents: t.Optional(t.Integer({ minimum: 0 })),
}

// position and image fields are server-managed (position computed, images via
// the dedicated image routes).
const _itemTemplateInsert = createInsertSchema(itemTemplates, itemTemplateAmounts)
export const CreateItemTemplateBody = t.Pick(_itemTemplateInsert, [
  'name',
  'description',
  'defaultQty',
  'defaultUnitPriceCents',
  'currency',
])

const _itemTemplateUpdate = createUpdateSchema(itemTemplates, itemTemplateAmounts)
export const UpdateItemTemplateBody = t.Pick(_itemTemplateUpdate, [
  'name',
  'description',
  'defaultQty',
  'defaultUnitPriceCents',
  'currency',
  'position',
])

const _groupInsert = createInsertSchema(itemTemplateGroups)
export const CreateItemTemplateGroupBody = t.Composite([
  t.Pick(_groupInsert, ['name', 'description', 'color', 'icon']),
  t.Object({ templateIds: t.Optional(t.Array(t.String())) }),
])

const _groupUpdate = createUpdateSchema(itemTemplateGroups)
export const UpdateItemTemplateGroupBody = t.Pick(_groupUpdate, [
  'name',
  'description',
  'color',
  'icon',
  'position',
])
