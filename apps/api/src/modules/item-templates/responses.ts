import { t } from 'elysia'
import { IsoInstant, NullableString, NotFoundResponse } from '@api/lib/wire-schema'

export const ItemTemplateResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  description: t.String(),
  defaultQty: t.Number(),
  defaultUnitPriceCents: t.Number(),
  currency: t.String(),
  position: t.Number(),
  imageR2Key: NullableString,
  imageUrl: t.Union([t.String(), t.Null()]),
  imageWidth: t.Union([t.Number(), t.Null()]),
  imageHeight: t.Union([t.Number(), t.Null()]),
  imageBlurDataUrl: t.Union([t.String(), t.Null()]),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})

export const ItemTemplateGroupTemplateSummary = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  defaultQty: t.Number(),
  defaultUnitPriceCents: t.Number(),
  currency: t.String(),
  position: t.Number(),
})

export const ItemTemplateGroupResponse = t.Object({
  id: t.String(),
  userId: t.String(),
  name: t.String(),
  description: t.String(),
  color: t.String(),
  icon: NullableString,
  position: t.Number(),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
  templates: t.Array(ItemTemplateGroupTemplateSummary),
})

export const ItemTemplatesListResponse = t.Array(ItemTemplateResponse)
export const ItemTemplateGroupsListResponse = t.Array(ItemTemplateGroupResponse)

export const ItemTemplateImageUrlResponse = t.Object({
  url: t.Union([t.String(), t.Null()]),
})

export { NotFoundResponse }
