import { itemTemplates } from '@mana/db'
import { and, asc, eq, max } from 'drizzle-orm'
import { db } from '@api/db'

export async function listItemTemplates(userId: string) {
  return db.select().from(itemTemplates)
    .where(eq(itemTemplates.userId, userId))
    .orderBy(asc(itemTemplates.position), asc(itemTemplates.createdAt))
}

export async function getOwnedItemTemplate(userId: string, templateId: string) {
  const [template] = await db.select().from(itemTemplates)
    .where(and(eq(itemTemplates.id, templateId), eq(itemTemplates.userId, userId)))
  return template ?? null
}

export async function createItemTemplate(
  userId: string,
  body: {
    name: string
    description?: string
    defaultQty?: number
    defaultUnitPriceCents?: number
    currency?: string
  },
) {
  const [maxRow] = await db.select({ position: max(itemTemplates.position) })
    .from(itemTemplates)
    .where(eq(itemTemplates.userId, userId))
  const [template] = await db.insert(itemTemplates).values({
    userId,
    name: body.name,
    description: body.description ?? '',
    defaultQty: body.defaultQty ?? 100,
    defaultUnitPriceCents: body.defaultUnitPriceCents ?? 0,
    currency: body.currency ?? 'THB',
    position: (maxRow?.position ?? -1) + 1,
  }).returning()
  return template
}

export async function patchItemTemplate(
  userId: string,
  templateId: string,
  body: Partial<{
    name: string
    description: string
    defaultQty: number
    defaultUnitPriceCents: number
    currency: string
  }>,
) {
  const [template] = await db.update(itemTemplates)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(itemTemplates.id, templateId), eq(itemTemplates.userId, userId)))
    .returning()
  return template ?? null
}

export async function patchItemTemplateImage(
  userId: string,
  templateId: string,
  image: {
    imageR2Key: string | null
    imageWidth: number | null
    imageHeight: number | null
    imageBlurDataUrl: string | null
  },
) {
  const [template] = await db.update(itemTemplates)
    .set({ ...image, updatedAt: new Date() })
    .where(and(eq(itemTemplates.id, templateId), eq(itemTemplates.userId, userId)))
    .returning()
  return template ?? null
}

export async function deleteItemTemplate(userId: string, templateId: string) {
  const [template] = await db.delete(itemTemplates)
    .where(and(eq(itemTemplates.id, templateId), eq(itemTemplates.userId, userId)))
    .returning()
  return template ?? null
}
