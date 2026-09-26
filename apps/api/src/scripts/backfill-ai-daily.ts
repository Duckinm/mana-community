import { config } from "dotenv";

config({ path: ".env" });
config({ path: "../../.env" });

// One-off: seed ai_action_daily from assistant chat-message timestamps so the
// usage heatmap shows history from before daily tracking existed (C-116).
// Token columns stay 0 — per-day token counts were never recorded historically.
// Excludes today (the live counter owns it) and never overwrites existing rows.
const { sql } = await import("drizzle-orm");
const { db } = await import("@api/db");

const result = await db.execute(sql`
  INSERT INTO ai_action_daily (id, user_id, day, count, input_tokens, output_tokens)
  SELECT gen_random_uuid()::text,
         user_id,
         (created_at AT TIME ZONE 'UTC')::date,
         count(*),
         0,
         0
  FROM chat_messages
  WHERE role = 'assistant'
    AND (created_at AT TIME ZONE 'UTC')::date < (now() AT TIME ZONE 'UTC')::date
  GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
  ON CONFLICT (user_id, day) DO NOTHING
`);

console.log(`backfill done (driver row count: ${result.count ?? "n/a"})`);
process.exit(0);
