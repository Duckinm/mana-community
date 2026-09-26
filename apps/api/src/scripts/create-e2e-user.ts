/**
 * Provisions the account the post-deploy suite signs in with.
 *
 * Verification is bypassed here, out-of-band, rather than in the app: production keeps
 * requireEmailVerification on and gains no test-only code path.
 *
 * Run once per environment:
 *   E2E_EMAIL=... E2E_PASSWORD=... bun apps/api/src/scripts/create-e2e-user.ts
 * Against production, prefix with the prod DATABASE_URL / BETTER_AUTH_URL.
 */
import { users } from "@mana/db";
import { eq } from "drizzle-orm";
import { auth } from "@api/auth";
import { db } from "@api/db";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!email || !password) {
  console.error("set E2E_EMAIL and E2E_PASSWORD");
  process.exit(1);
}

const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

if (!existing) {
  await auth.api.signUpEmail({
    body: { email, password, name: "E2E Bot" },
  });
}

const [user] = await db
  .update(users)
  .set({ emailVerified: true, onboardedAt: new Date() })
  .where(eq(users.email, email))
  .returning({ id: users.id, email: users.email, role: users.role });

console.log(user ? `ready: ${user.email} (${user.role})` : `failed: ${email} not found`);
process.exit(0);
