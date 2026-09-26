/**
 * CMS seed script — populates the global registries used by the article generator.
 *
 * Usage:
 *   cd packages/db
 *   bun run seed:cms
 *
 * Global data (no user), idempotent: competitors already present by name are left untouched.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL env var is required')
  process.exit(1)
}

const isProd = process.env.NODE_ENV === 'production' || new URL(DATABASE_URL).host.includes('neon.tech')
if (isProd && !process.argv.includes('--force')) {
  console.error('ERROR: refusing to seed a production database — pass --force to override')
  process.exit(1)
}

const sql = postgres(DATABASE_URL)
const db = drizzle(sql, { schema })

const COMPETITORS = [
  { name: 'Fastwork', url: 'https://fastwork.co', notes: 'Thai freelance marketplace' },
  { name: 'FlowAccount', url: 'https://flowaccount.com', notes: 'Thai SME accounting SaaS' },
  { name: 'Paypers', url: 'https://paypers.io', notes: 'Thai invoicing and payment tool' },
]

const KEYWORDS = [
  { term: 'ตั้งราคางานฟรีแลนซ์', priority: 12 },
  { term: 'ขอบเขตงานฟรีแลนซ์', priority: 11 },
  { term: 'ใบเสนอราคาฟรีแลนซ์', priority: 10 },
  { term: 'ทวงเงินลูกค้า', priority: 9 },
  { term: 'สัญญาจ้างฟรีแลนซ์', priority: 8 },
  { term: 'กระแสเงินสดฟรีแลนซ์', priority: 7 },
  { term: 'บริหารลูกค้าฟรีแลนซ์', priority: 6 },
  { term: 'วางแผนงานฟรีแลนซ์', priority: 5 },
  { term: 'เงินสำรองฟรีแลนซ์', priority: 4 },
  { term: 'ภาษีฟรีแลนซ์', priority: 3 },
  { term: 'ใบกำกับภาษีอิเล็กทรอนิกส์', priority: 2 },
  { term: 'PromptPay รับเงิน', priority: 1 },
]

const existing = await db.select({ name: schema.cmsCompetitors.name }).from(schema.cmsCompetitors)
const existingNames = new Set(existing.map((row) => row.name))
const missing = COMPETITORS.filter((competitor) => !existingNames.has(competitor.name))

if (missing.length > 0) {
  await db.insert(schema.cmsCompetitors).values(missing)
}

const existingKeywords = await db.select({ term: schema.cmsKeywords.term }).from(schema.cmsKeywords)
const existingTerms = new Set(existingKeywords.map((row) => row.term))
const missingKeywords = KEYWORDS.filter((keyword) => !existingTerms.has(keyword.term))

if (missingKeywords.length > 0) {
  await db.insert(schema.cmsKeywords).values(missingKeywords)
}

console.log(`CMS competitors: seeded ${missing.length}, skipped ${COMPETITORS.length - missing.length}`)
console.log(`CMS keywords: seeded ${missingKeywords.length}, skipped ${KEYWORDS.length - missingKeywords.length}`)

await sql.end()
