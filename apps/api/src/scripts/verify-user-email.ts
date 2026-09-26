/**
 * Marks an already-registered account as email-verified.
 *
 * The persona audit runs (tests/e2e/persona-*.spec.ts) register through the real
 * /register wizard, which lands on the "check your email" notice because
 * requireEmailVerification is on. Flipping the flag out-of-band keeps that
 * production behaviour intact instead of adding a test-only bypass to the app.
 * Unlike create-e2e-user.ts this leaves onboardedAt alone — a persona must stay cold.
 *
 *    cd apps/api && bun src/scripts/verify-user-email.ts <email>
 */
import { users } from "@mana/db";
import { eq } from "drizzle-orm";
import { db } from "@api/db";

const email = process.argv[2];

if (!email) {
  console.error("usage:  cd apps/api && bun src/scripts/verify-user-email.ts <email>");
  process.exit(1);
}

const [user] = await db
  .update(users)
  .set({ emailVerified: true })
  .where(eq(users.email, email))
  .returning({ email: users.email });

console.log(user ? `verified: ${user.email}` : `failed: ${email} not found`);
process.exit(user ? 0 : 1);
