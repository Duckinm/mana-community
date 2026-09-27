import { projects } from '@mana/db'
import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '@api/db'

export async function countActiveProjects(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        eq(projects.archived, false),
      ),
    );
  return row?.value ?? 0;
}
