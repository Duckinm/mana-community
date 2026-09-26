import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const pkgRoot = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(pkgRoot, '../..')
const migrationsFolder = resolve(pkgRoot, 'drizzle')

// local convenience: read DATABASE_URL from apps/api/.env without dotenv,
// which is a devDependency and absent in the production image
if (!process.env.DATABASE_URL) {
  try {
    const envFile = readFileSync(resolve(repoRoot, 'apps/api/.env'), 'utf8')
    const match = envFile.match(/^DATABASE_URL=(.+)$/m)
    if (match) process.env.DATABASE_URL = match[1].trim()
  } catch {
    // no .env — fall through to default
  }
}

const url =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/mana'

type Journal = {
  entries: { tag: string; breakpoints: boolean; when: number }[]
}

// Only duplicate_object (42710) is skippable: 0002's verbatim FK re-asserts hit it
// on fresh databases. Every other error aborts the deploy — silently skipping
// undefined/duplicate schema errors is how prod drifted unnoticed (see 0002).
const SKIPPABLE_CODES = new Set(['42710'])

function migrationHash(tag: string): string {
  const sql = readFileSync(resolve(migrationsFolder, `${tag}.sql`), 'utf8')
  return createHash('sha256').update(sql).digest('hex')
}

function splitStatements(sql: string): string[] {
  return sql
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean)
}

const journal = JSON.parse(
  readFileSync(resolve(migrationsFolder, 'meta/_journal.json'), 'utf8'),
) as Journal

const sql = postgres(url, { max: 1 })

try {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `

  const applied = new Set(
    (await sql`SELECT hash FROM drizzle.__drizzle_migrations`).map((row) => row.hash),
  )

  // Applied migration files must never be edited: a changed file gets a new hash and
  // would re-run against live schema. If any migration BEFORE the newest applied one
  // is unrecognized, history was rewritten — refuse to run.
  const hashes = journal.entries.map((entry) => ({ tag: entry.tag, hash: migrationHash(entry.tag) }))
  let lastApplied = -1
  for (let i = 0; i < hashes.length; i++) if (applied.has(hashes[i].hash)) lastApplied = i
  const rewritten = hashes.slice(0, Math.max(lastApplied, 0)).filter((h) => !applied.has(h.hash))
  if (rewritten.length > 0) {
    console.error(
      `[migrate] refusing to run: ${rewritten.map((h) => h.tag).join(', ')} changed after later migrations were applied. Create a new migration instead of editing applied ones.`,
    )
    process.exit(1)
  }

  let ran = 0
  let skipped = 0

  for (const entry of journal.entries) {
    const hash = migrationHash(entry.tag)
    if (applied.has(hash)) {
      skipped++
      continue
    }

    const fileSql = readFileSync(resolve(migrationsFolder, `${entry.tag}.sql`), 'utf8')
    // This was a one-off Cloud account operation, not schema. Keep its original hash
    // so existing installations remain valid, but never grant that account on replay.
    const statements = entry.tag === '0004_promote_owner_admin' ? [] : splitStatements(fileSql)

    // One transaction per migration: a mid-migration failure now rolls back cleanly instead of
    // leaving earlier statements committed with the hash never recorded (see 0014 incident).
    await sql.begin(async (tx) => {
      for (const statement of statements) {
        try {
          await tx.savepoint((sp) => sp.unsafe(statement))
        } catch (err) {
          const code = (err as { code?: string }).code
          if (code && SKIPPABLE_CODES.has(code)) {
            console.warn(`[migrate] ${entry.tag}: skipped duplicate object (${code}): ${statement.slice(0, 80)}`)
            continue
          }
          if (code === '42P07' || code === '42701') {
            console.error(
              `[migrate] ${entry.tag} hit "already exists" (${code}). This database has the schema but no matching bookkeeping (predates the baseline, or an applied file was edited). Fix the bookkeeping or recreate the database — do not re-add ${code} to the skip list.`,
            )
          }
          console.error(`[migrate] failed statement: ${statement.slice(0, 120)}`)
          throw err
        }
      }
      await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`
    })
    applied.add(hash)
    ran++
    console.log(`[migrate] applied ${entry.tag}`)
  }

  console.log(`Migration complete (${ran} applied, ${skipped} already recorded)`)
} finally {
  await sql.end()
}
