import { db } from '@api/db'
import { categories } from '@mana/db'
import { eq, and } from 'drizzle-orm'

export async function ensureCategory(
  userId: string,
  name: string,
  type: 'revenue' | 'expense',
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return

  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, type)))

  if (rows.some((row) => row.name.toLowerCase() === trimmed.toLowerCase())) return

  await db.insert(categories).values({
    userId,
    name: trimmed,
    type,
  })
}
