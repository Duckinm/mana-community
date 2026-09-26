import { and, asc, eq, inArray } from 'drizzle-orm'
import { itemTemplateGroupMembers, itemTemplates } from '@mana/db'
import { db } from '@api/db'
import { ValidationError } from '@api/lib/errors'

export async function requireOwnedItemTemplateIds(userId: string, templateIds: string[]) {
  const uniqueTemplateIds = [...new Set(templateIds)]
  if (uniqueTemplateIds.length === 0) return uniqueTemplateIds

  const owned = await db
    .select({ id: itemTemplates.id })
    .from(itemTemplates)
    .where(and(eq(itemTemplates.userId, userId), inArray(itemTemplates.id, uniqueTemplateIds)))

  if (owned.length !== uniqueTemplateIds.length) {
    throw new ValidationError('Every item template must belong to you')
  }

  return uniqueTemplateIds
}

export async function listOwnedItemTemplateGroupMembers(userId: string, groupIds: string[], limit?: number) {
  if (groupIds.length === 0) return []

  const query = db
    .select({
      groupId: itemTemplateGroupMembers.groupId,
      position: itemTemplateGroupMembers.position,
      id: itemTemplates.id,
      name: itemTemplates.name,
      description: itemTemplates.description,
      defaultQty: itemTemplates.defaultQty,
      defaultUnitPriceCents: itemTemplates.defaultUnitPriceCents,
      currency: itemTemplates.currency,
    })
    .from(itemTemplateGroupMembers)
    .innerJoin(itemTemplates, eq(itemTemplateGroupMembers.templateId, itemTemplates.id))
    .where(and(
      inArray(itemTemplateGroupMembers.groupId, groupIds),
      eq(itemTemplates.userId, userId),
    ))
    .orderBy(asc(itemTemplateGroupMembers.position))

  return limit === undefined ? query : query.limit(limit)
}
