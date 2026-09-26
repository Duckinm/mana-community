import { db } from '@api/db'
import { labels } from '@mana/db'
import { eq, and, asc } from 'drizzle-orm'
import { ValidationError } from '@api/lib/errors'

function labelToClientDto(label: typeof labels.$inferSelect) {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
  }
}

function canonicalLabelName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new ValidationError('Label name is required')
  return trimmed
}

export async function listLabels(userId: string) {
  const rows = await db
    .select()
    .from(labels)
    .where(eq(labels.userId, userId))
    .orderBy(asc(labels.name))
  return rows.map(labelToClientDto)
}

export async function createLabel(
  userId: string,
  body: { name: string; color?: string },
) {
  const [label] = await db.insert(labels).values({
    userId,
    name: canonicalLabelName(body.name),
    color: body.color ?? '#D4A843',
  }).returning()
  return labelToClientDto(label)
}

export async function patchLabel(
  userId: string,
  labelId: string,
  body: Partial<{ name: string; color: string }>,
) {
  const patch: Partial<typeof labels.$inferInsert> = {}
  if (body.name !== undefined) patch.name = canonicalLabelName(body.name)
  if (body.color !== undefined) patch.color = body.color
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(labels)
    .set(patch)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
    .returning()

  return updated ? labelToClientDto(updated) : null
}

export async function deleteLabel(userId: string, labelId: string) {
  const [deleted] = await db
    .delete(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
    .returning({ id: labels.id })
  return deleted ?? null
}
