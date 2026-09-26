import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repo = resolve(import.meta.dir, '../..')
const fixture = mkdtempSync(resolve(repo, 'packages/db/.migration-check-'))
const container = `mana-migration-check-${randomUUID()}`
const password = randomUUID()
const journalPath = resolve(fixture, 'drizzle/meta/_journal.json')
const retiredTag = '0004_promote_owner_admin'

function run(args: string[], env = process.env): string {
  const result = Bun.spawnSync(args, { cwd: repo, env, stdout: 'pipe', stderr: 'pipe' })
  assert.equal(result.exitCode, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`)
  return result.stdout.toString().trim()
}

function query(database: string, statement: string): string {
  return run(['docker', 'exec', container, 'psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-Atc', statement])
}

try {
  cpSync(resolve(repo, 'packages/db/migrate.ts'), resolve(fixture, 'migrate.ts'))
  cpSync(resolve(repo, 'packages/db/drizzle'), resolve(fixture, 'drizzle'), { recursive: true })
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { tag: string }[] }
  const retiredIndex = journal.entries.findIndex((entry) => entry.tag === retiredTag)
  assert.ok(retiredIndex > 0)
  const originalSql = readFileSync(resolve(fixture, `drizzle/${retiredTag}.sql`), 'utf8')
  const hash = createHash('sha256').update(originalSql).digest('hex')
  const email = originalSql.match(/WHERE "email" = '([^']+)'/)?.[1]
  assert.ok(email)

  run(['docker', 'run', '-d', '--name', container, '-e', `POSTGRES_PASSWORD=${password}`, '-p', '127.0.0.1::5432', 'postgres:16.15-alpine3.24'])
  for (let attempt = 0; ; attempt++) {
    const probe = Bun.spawnSync(['docker', 'exec', container, 'pg_isready', '-U', 'postgres'], { stdout: 'ignore', stderr: 'ignore' })
    if (probe.exitCode === 0) break
    assert.ok(attempt < 60, 'Disposable PostgreSQL did not become ready')
    await Bun.sleep(500)
  }
  const port = run(['docker', 'port', container, '5432/tcp']).split(':').at(-1)
  const migrate = (database: string) => run([process.execPath, resolve(fixture, 'migrate.ts')], {
    ...process.env,
    DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/${database}`,
  })

  for (const scenario of ['fresh', 'upgrade', 'cloud']) {
    query('postgres', `CREATE DATABASE ${scenario}`)
    if (scenario !== 'fresh') {
      writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, retiredIndex) }))
      migrate(scenario)
      query(scenario, `INSERT INTO users (id, name, email, role) VALUES ('owner', 'Owner', '${email.replaceAll("'", "''")}', 'user'), ('existing-admin', 'Admin', 'admin@example.test', 'admin')`)
      if (scenario === 'cloud') {
        query(scenario, originalSql)
        query(scenario, `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('${hash}', 1)`)
      }
      writeFileSync(journalPath, JSON.stringify(journal))
    }
    migrate(scenario)
    assert.equal(query(scenario, `SELECT count(*) FROM drizzle.__drizzle_migrations WHERE hash = '${hash}'`), '1')
    if (scenario === 'fresh') {
      assert.equal(query(scenario, 'SELECT count(*) FROM users'), '0')
      query(scenario, `INSERT INTO users (id, name, email, role) VALUES ('owner', 'Owner', '${email.replaceAll("'", "''")}', 'user')`)
    }
    migrate(scenario)
    assert.equal(query(scenario, "SELECT role FROM users WHERE id = 'owner'"), scenario === 'cloud' ? 'admin' : 'user')
    if (scenario !== 'fresh') assert.equal(query(scenario, "SELECT role FROM users WHERE id = 'existing-admin'"), 'admin')
    assert.equal(query(scenario, 'SELECT count(*) FROM drizzle.__drizzle_migrations'), String(journal.entries.length))
    console.log(`PASS: ${scenario} preserves account roles and original migration bookkeeping`)
  }
} finally {
  Bun.spawnSync(['docker', 'rm', '-fv', container], { stdout: 'ignore', stderr: 'inherit' })
  rmSync(fixture, { recursive: true, force: true })
}
