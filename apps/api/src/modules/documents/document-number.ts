import { db } from "@api/db";
import { documentSequences } from "@mana/db";
import { sql } from "drizzle-orm";

/** Numbers follow `TYPEYYMMNNN` (e.g. INV2607001); the running number continues across the year. */
export async function generateDocumentNumber(
  userId: string,
  type: string,
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const yy = String(year % 100).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const [row] = await db
    .insert(documentSequences)
    .values({ userId, type, year, seq: 1 })
    .onConflictDoUpdate({
      target: [
        documentSequences.userId,
        documentSequences.type,
        documentSequences.year,
      ],
      set: { seq: sql`${documentSequences.seq} + 1` },
    })
    .returning({ seq: documentSequences.seq });
  return `${type}${yy}${mm}${String(row.seq).padStart(3, "0")}`;
}
