/**
 * Seed script — populates the DB with realistic starter data for a given user.
 *
 * Usage:
 *   cd packages/db
 *   bun run seed --email user@example.com
 *
 * The user must already exist (sign up first). The script is idempotent:
 * it skips seeding if the user already has projects or contacts.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { Faker, en } from '@faker-js/faker'
import * as schema from './schema'
import { textToTiptapDoc } from './lib/rich-text'
import { DEFAULT_REMARK_TEMPLATE_SEEDS } from './default-remark-templates'

// ─── DB connection ─────────────────────────────────────────────────────────────

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

// ─── Args ──────────────────────────────────────────────────────────────────────

const emailIndex = process.argv.indexOf('--email')
const emailArg = process.argv.find((a) => a.startsWith('--email='))?.slice('--email='.length)
  ?? (emailIndex >= 0 ? process.argv[emailIndex + 1] : undefined)

if (!emailArg || emailArg.startsWith('--')) {
  console.error('ERROR: pass --email <user@example.com>')
  process.exit(1)
}

// ─── Seed data helpers ─────────────────────────────────────────────────────────

const faker = new Faker({ locale: [en] })
faker.seed(2026)

const PROJECT_COLORS  = ['#D4A843', '#6BCB77', '#C3A0FF', '#4ECDC4', '#FF8A65', '#FF6B6B', '#60A5FA']
const CONTACT_COLORS  = ['#D4A843', '#6BCB77', '#C3A0FF', '#4ECDC4', '#FF8A65', '#FF6B6B', '#60A5FA', '#F9A8D4', '#A8DADC']
const STATUSES        = ['todo', 'in-progress', 'done'] as const
const MET_VIA_OPTIONS = ['LinkedIn', 'Twitter / X', 'Referral', 'Conference / Event', 'Cold Outreach', 'In Person', 'Discord', 'GitHub', 'Upwork', 'Direct'] as const
const PRIORITIES      = ['high', 'med', 'low'] as const
const TAGS            = ['Design', 'Dev', 'Copywriting', 'Social', 'Photo', 'UX', 'SEO', 'Admin', 'Research']
const MONTHS          = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TIMELINE_TYPES  = ['call', 'invoice', 'payment', 'message', 'project', 'referral']

function rMonth() {
  return MONTHS[faker.number.int({ min: 8, max: 11 })]
}

// ─── Seed contacts ─────────────────────────────────────────────────────────────

async function seedContacts(userId: string) {
  const existing = await db
    .select({ id: schema.contacts.id })
    .from(schema.contacts)
    .where(eq(schema.contacts.userId, userId))

  if (existing.length > 0) {
    console.log(`  contacts: skipped (${existing.length} already exist)`)
    return
  }

  const rows = Array.from({ length: 12 }, (_, i) => {
    const firstName = faker.person.firstName()
    const lastName  = faker.person.lastName()
    const company   = faker.company.name()
    const domain    = `client-${i + 1}.example.com`
    const color     = CONTACT_COLORS[i % CONTACT_COLORS.length]
    const daysSinceContact = faker.number.int({ min: 1, max: 14 })

    const timelineCount = faker.number.int({ min: 2, max: 6 })
    const timeline = Array.from({ length: timelineCount }, (_, ti) => {
      const type = TIMELINE_TYPES[ti % TIMELINE_TYPES.length]
      const day   = faker.number.int({ min: 1, max: 28 })
      const month = MONTHS[faker.number.int({ min: 8, max: 11 })]
      const events: Record<string, string> = {
        call:     `Discovery call · ${faker.number.int({ min: 15, max: 60 })} min`,
        invoice:  `Invoice #INV-0${faker.number.int({ min: 10, max: 99 })} sent · $${faker.number.int({ min: 1, max: 12 }) * 400}`,
        payment:  `Invoice paid · $${faker.number.int({ min: 1, max: 12 }) * 400}`,
        message:  `${faker.person.firstName()} · "${faker.lorem.sentence({ min: 4, max: 8 })}"`,
        project:  `${faker.company.catchPhrase()} started`,
        referral: `Referral from ${faker.person.fullName()}`,
      }
      return { date: `${month} ${day}`, event: events[type], type }
    })

    return {
      userId,
      name:           `${firstName} ${lastName}`,
      initials:       `${firstName[0]}${lastName[0]}`,
      role:           faker.person.jobTitle(),
      company,
      email:          faker.internet.email({ firstName: firstName.toLowerCase(), lastName: lastName.toLowerCase(), provider: domain }),
      website:        domain,
      color,
      tags: JSON.stringify([
        faker.commerce.department(),
        i < 8 ? 'Active client' : 'Follow up needed',
      ]),
      lastContactedAt: new Date(Date.now() - daysSinceContact * 86_400_000),
      relationshipLevel: faker.number.int({ min: 1, max: 5 }),
      metVia: MET_VIA_OPTIONS[faker.number.int({ min: 0, max: MET_VIA_OPTIONS.length - 1 })],
      personaSummary: faker.lorem.paragraph(),
      timeline: JSON.stringify(timeline),
    }
  })

  // Deterministic overrides so cross-references (e.g. project → contact) stay stable
  rows[0] = { ...rows[0], name: 'James Whitfield', initials: 'JW', company: 'Acme Corp',   email: 'james@example.com', website: 'client-1.example.com',    color: '#FF8A65', metVia: 'Referral', relationshipLevel: 4 }
  rows[1] = { ...rows[1], name: 'Nina Sato',       initials: 'NS', company: 'Studio Nine', email: 'nina@example.com',       website: 'client-2.example.com',   color: '#C3A0FF', metVia: 'LinkedIn', relationshipLevel: 3 }
  rows[2] = { ...rows[2], name: 'Sarah Chen',      initials: 'SC', company: 'Arch Studio', email: 'sarah@example.com',       website: 'client-3.example.com',   color: '#D4A843' }
  rows[3] = { ...rows[3], name: 'Marcus Osei',     initials: 'MO', company: 'Bloom Health',email: 'marcus@example.com',     website: 'client-4.example.com',  color: '#6BCB77' }
  rows[4] = { ...rows[4], name: 'Daniel Park',     initials: 'DP', company: 'Volta Pay',   email: 'daniel@example.com',       website: 'client-5.example.com',    color: '#4ECDC4' }

  await db.insert(schema.contacts).values(rows)
  console.log(`  contacts: seeded ${rows.length} records`)
}

// ─── Seed projects + tasks ─────────────────────────────────────────────────────

async function seedProjects(userId: string) {
  const existing = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId))

  if (existing.length > 0) {
    console.log(`  projects: skipped (${existing.length} already exist)`)
    return
  }

  // Fetch contacts so we can cross-reference them
  const userContacts = await db
    .select({ id: schema.contacts.id, name: schema.contacts.name })
    .from(schema.contacts)
    .where(eq(schema.contacts.userId, userId))

  // Global labels, shared across all of the user's projects
  const labelRows = Array.from({ length: 5 }, () => ({
    userId,
    name:  faker.company.buzzAdjective(),
    color: PROJECT_COLORS[faker.number.int({ min: 0, max: PROJECT_COLORS.length - 1 })],
  }))
  const insertedLabels = await db.insert(schema.labels).values(labelRows).returning({ id: schema.labels.id })
  console.log(`  labels: seeded ${insertedLabels.length} records`)

  const projectRows = Array.from({ length: 5 }, (_, i) => {
    const contact = userContacts[i % userContacts.length]
    const labelIds = faker.helpers.arrayElements(insertedLabels, { min: 1, max: 3 }).map((l) => l.id)
    return {
      userId,
      name:        faker.company.name(),
      client:      contact?.name ?? faker.company.name(),
      color:       PROJECT_COLORS[i % PROJECT_COLORS.length],
      startDate:   `${rMonth()} ${faker.number.int({ min: 1, max: 15 })}`,
      dueDate:     `${rMonth()} ${faker.number.int({ min: 16, max: 28 })}`,
      description: textToTiptapDoc(faker.lorem.sentence({ min: 8, max: 16 })),
      archived:    false,
      labelIds:    JSON.stringify(labelIds),
      contactId:   contact?.id ?? null,
    }
  })

  const insertedProjects = await db
    .insert(schema.projects)
    .values(projectRows)
    .returning({ id: schema.projects.id, client: schema.projects.client })

  // Seed tasks for each project
  let totalTasks = 0
  for (const project of insertedProjects) {
    const taskRows = STATUSES.flatMap((status) =>
      Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, (_, ti) => ({
        projectId:  project.id,
        userId,
        title:      faker.company.catchPhrase(),
        status,
        priority:   PRIORITIES[faker.number.int({ min: 0, max: 2 })],
        due:        `${rMonth()} ${faker.number.int({ min: 1, max: 28 })}`,
        tags:       JSON.stringify(
          Array.from(
            new Set(Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () =>
              TAGS[faker.number.int({ min: 0, max: TAGS.length - 1 })],
            )),
          ),
        ),
        aiAssigned: faker.datatype.boolean(0.2),
        position:   ti,
      })),
    )
    if (taskRows.length > 0) {
      await db.insert(schema.tasks).values(taskRows)
      totalTasks += taskRows.length
    }
  }

  console.log(`  projects: seeded ${insertedProjects.length} records with ${totalTasks} tasks`)
}

// ─── Seed transactions ─────────────────────────────────────────────────────────

const REVENUE_CATEGORIES  = ['Client payment', 'Invoice', 'Retainer', 'Consulting', 'Royalties', 'Referral']
const EXPENSE_CATEGORIES  = ['Subscriptions', 'Software', 'Hardware', 'Marketing', 'Office', 'Travel', 'Contractor']
const REVENUE_STATUSES    = ['received', 'pending', 'overdue'] as const
const EXPENSE_STATUSES    = ['paid', 'pending'] as const

/** Returns an ISO date string (YYYY-MM-DD) within the last `monthsBack` months. */
function randomRecentDate(monthsBack: number): string {
  const now   = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - monthsBack)
  const ms  = start.getTime() + Math.random() * (now.getTime() - start.getTime())
  const d   = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const WALLET_SEEDS = [
  { name: 'Kasikorn Checking', type: 'bank_transfer', color: '#5b8def', isDefault: true },
  { name: 'Wise USD',          type: 'bank_transfer', color: '#4ade80', isDefault: false },
  { name: 'Visa Debit',        type: 'card',          color: '#a78bfa', isDefault: false, lastFour: '4242' },
] as const

async function seedWallets(userId: string) {
  const existing = await db
    .select({ id: schema.wallets.id })
    .from(schema.wallets)
    .where(eq(schema.wallets.userId, userId))

  if (existing.length > 0) {
    console.log(`  wallets: skipped (${existing.length} already exist)`)
    return db.select().from(schema.wallets).where(eq(schema.wallets.userId, userId))
  }

  const rows = await db
    .insert(schema.wallets)
    .values(WALLET_SEEDS.map((w) => ({ userId, ...w })))
    .returning()

  console.log(`  wallets: seeded ${rows.length} records`)
  return rows
}

async function seedTransactions(userId: string, wallets: (typeof schema.wallets.$inferSelect)[]) {
  const existing = await db
    .select({ id: schema.transactions.id })
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId))

  if (existing.length > 0) {
    console.log(`  transactions: skipped (${existing.length} already exist)`)
    return
  }

  const randomWalletId = () => wallets[faker.number.int({ min: 0, max: wallets.length - 1 })]?.id ?? null

  // 2 guaranteed overdue invoices (>20 days old) — needed for reminder email testing
  const overdueClients = [
    { name: 'Acme Corp',    amount: 420000, ref: 'INV-042' },
    { name: 'Studio Nine',  amount: 360000, ref: 'INV-036' },
  ]
  const guaranteedOverdue = overdueClients.map(({ name, amount, ref }) => {
    const d = new Date()
    d.setDate(d.getDate() - faker.number.int({ min: 20, max: 40 }))
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      userId,
      type: 'revenue' as const,
      amountCents: amount, // in cents
      description: name,
      category: 'Invoice',
      date,
      status: 'overdue',
      walletId: randomWalletId(),
      reference: ref,
      notes: 'Overdue — pending follow-up',
    }
  })

  // 7 additional revenue transactions with random statuses
  const revenueRows = Array.from({ length: 7 }, (_, i) => {
    const refNum  = faker.number.int({ min: 10, max: 99 })
    const amountDollars = faker.number.int({ min: 8, max: 80 }) * 100 // $800–$8000
    const status  = REVENUE_STATUSES[faker.number.int({ min: 0, max: REVENUE_STATUSES.length - 1 })]
    return {
      userId,
      type: 'revenue' as const,
      amountCents: amountDollars * 100, // store in cents
      description: `Invoice #INV-0${refNum}`,
      category: REVENUE_CATEGORIES[faker.number.int({ min: 0, max: REVENUE_CATEGORIES.length - 1 })],
      date: randomRecentDate(6),
      status,
      walletId: randomWalletId(),
      reference: `INV-0${refNum}`,
      notes: status === 'overdue' ? 'Overdue — pending follow-up' : null,
    }
  })

  // 12 expense transactions using fixed tool amounts (amounts already in cents)
  const tools = [
    { name: 'Adobe Creative Cloud', amount: 5400 },
    { name: 'Figma Pro',            amount: 1500 },
    { name: 'Notion',               amount: 1600 },
    { name: 'Linear',               amount:  800 },
    { name: 'Vercel Pro',           amount: 2000 },
    { name: 'GitHub Copilot',       amount: 1900 },
    { name: 'Loom',                 amount: 1200 },
    { name: 'Webflow',              amount: 2300 },
    { name: 'Zapier',               amount: 1900 },
    { name: 'Google Workspace',     amount: 1200 },
    { name: 'Slack',                amount:  875 },
    { name: 'AWS',                  amount: faker.number.int({ min: 20, max: 200 }) * 100 },
  ]

  const expenseRows = tools.map((tool) => ({
    userId,
    type: 'expense' as const,
    amountCents: tool.amount, // already in cents
    description: tool.name,
    category: EXPENSE_CATEGORIES[faker.number.int({ min: 0, max: EXPENSE_CATEGORIES.length - 1 })],
    date: randomRecentDate(6),
    status: EXPENSE_STATUSES[faker.number.int({ min: 0, max: EXPENSE_STATUSES.length - 1 })],
    walletId: randomWalletId(),
    reference: null,
    notes: null,
  }))

  const rows = [...guaranteedOverdue, ...revenueRows, ...expenseRows]
  await db.insert(schema.transactions).values(rows)
  console.log(`  transactions: seeded ${guaranteedOverdue.length} overdue + ${revenueRows.length} revenue + ${expenseRows.length} expense records`)
}

// ─── Seed storage folders ──────────────────────────────────────────────────────

/**
 * Seeds virtual storage folders for the user:
 * - One folder per contact (first 5), linked via entityType='contact'
 * - One folder per project (first 3), linked via entityType='project'
 * - Two standalone root folders: "Invoices" and "Assets"
 * Skips if the user already has any storage folders (idempotent).
 */
async function seedStorageFolders(userId: string) {
  const existing = await db
    .select({ id: schema.storageFolders.id })
    .from(schema.storageFolders)
    .where(eq(schema.storageFolders.userId, userId))

  if (existing.length > 0) {
    console.log(`  storage folders: skipped (${existing.length} already exist)`)
    return
  }

  // Fetch first 5 contacts for this user
  const userContacts = await db
    .select({ id: schema.contacts.id, name: schema.contacts.name, color: schema.contacts.color })
    .from(schema.contacts)
    .where(eq(schema.contacts.userId, userId))

  const contactFolders = userContacts.slice(0, 5).map((contact: { id: string; name: string; color: string | null }) => ({
    userId,
    name:       contact.name,
    entityType: 'contact',
    entityId:   contact.id,
    color:      contact.color,
  }))

  // Fetch first 3 projects for this user
  const userProjects = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId))

  const projectFolders = userProjects.slice(0, 3).map((project: { id: string; name: string }) => ({
    userId,
    name:       project.name,
    entityType: 'project',
    entityId:   project.id,
    color:      null,
  }))

  // Standalone root folders not linked to any entity
  const standaloneFolders = [
    { userId, name: 'Invoices', entityType: null, entityId: null, color: null },
    { userId, name: 'Assets',   entityType: null, entityId: null, color: null },
  ]

  const rows = [...contactFolders, ...projectFolders, ...standaloneFolders]
  await db.insert(schema.storageFolders).values(rows)
  console.log(`  storage folders: seeded ${rows.length} records`)
}

// ─── Seed storage files ────────────────────────────────────────────────────────

const FILE_TEMPLATES = [
  { kind: 'pdf',   ext: 'pdf',  mime: 'application/pdf',                                                            minBytes: 100_000, maxBytes: 800_000 },
  { kind: 'doc',   ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',    minBytes:  50_000, maxBytes: 300_000 },
  { kind: 'sheet', ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',          minBytes:  30_000, maxBytes: 200_000 },
  { kind: 'image', ext: 'jpg',  mime: 'image/jpeg',                                                                 minBytes: 500_000, maxBytes: 4_000_000 },
] as const

async function seedStorageFiles(userId: string) {
  const existing = await db
    .select({ id: schema.storageFiles.id })
    .from(schema.storageFiles)
    .where(eq(schema.storageFiles.userId, userId))

  if (existing.length > 0) {
    console.log(`  storage files: skipped (${existing.length} already exist)`)
    return
  }

  const folders = await db
    .select({ id: schema.storageFolders.id })
    .from(schema.storageFolders)
    .where(eq(schema.storageFolders.userId, userId))

  const rows = folders.flatMap((folder) => {
    const count = faker.number.int({ min: 2, max: 4 })
    return Array.from({ length: count }, () => {
      const tpl = FILE_TEMPLATES[faker.number.int({ min: 0, max: FILE_TEMPLATES.length - 1 })]
      const baseName = faker.system.fileName({ extensionCount: 0 }).replace(/[^a-z0-9_-]/gi, '_')
      const filename = `${baseName}.${tpl.ext}`
      const fileId   = crypto.randomUUID()
      return {
        userId,
        name:      filename,
        kind:      tpl.kind,
        sizeBytes: faker.number.int({ min: tpl.minBytes, max: tpl.maxBytes }),
        mimeType:  tpl.mime,
        folderId:  folder.id,
        r2Key:     `files/${userId}/${fileId}/${filename}`,
      }
    })
  })

  if (rows.length > 0) {
    await db.insert(schema.storageFiles).values(rows)
  }
  console.log(`  storage files: seeded ${rows.length} records across ${folders.length} folders`)
}

async function seedRemarkTemplates(userId: string) {
  const existing = await db
    .select({ id: schema.remarkTemplates.id })
    .from(schema.remarkTemplates)
    .where(eq(schema.remarkTemplates.userId, userId))
    .limit(1)

  if (existing.length > 0) {
    console.log('  remark templates: skipped (already exist)')
    return
  }

  await db.insert(schema.remarkTemplates).values(
    DEFAULT_REMARK_TEMPLATE_SEEDS.map((seed, position) => ({
      userId,
      name: seed.name,
      body: seed.body,
      defaultFor: seed.defaultFor,
      position,
    })),
  )
  console.log(`  remark templates: seeded ${DEFAULT_REMARK_TEMPLATE_SEEDS.length} records`)
}

const ITEM_TEMPLATE_SEEDS = [
  { name: 'Brand discovery workshop', description: 'Half-day strategy and positioning session', defaultQty: 100, defaultUnitPriceCents: 180000, currency: 'THB' },
  { name: 'Landing page design', description: 'Responsive homepage or campaign page design', defaultQty: 100, defaultUnitPriceCents: 320000, currency: 'THB' },
  { name: 'Frontend implementation', description: 'React/TanStack implementation for approved screens', defaultQty: 100, defaultUnitPriceCents: 450000, currency: 'THB' },
  { name: 'Copy polish', description: 'Rewrite and tighten customer-facing product copy', defaultQty: 100, defaultUnitPriceCents: 90000, currency: 'THB' },
  { name: 'Product photography', description: 'Half-day shoot with basic retouching', defaultQty: 100, defaultUnitPriceCents: 240000, currency: 'THB' },
  { name: 'Monthly maintenance', description: 'Bug fixes, content updates, and light support', defaultQty: 100, defaultUnitPriceCents: 150000, currency: 'THB' },
  { name: 'Invoice setup', description: 'Document template, payment terms, and tax fields', defaultQty: 100, defaultUnitPriceCents: 60000, currency: 'THB' },
  { name: 'SEO baseline', description: 'Metadata, headings, sitemap, and basic search setup', defaultQty: 100, defaultUnitPriceCents: 85000, currency: 'THB' },
  { name: 'Analytics setup', description: 'GA4, events, conversion goals, and dashboard handoff', defaultQty: 100, defaultUnitPriceCents: 70000, currency: 'THB' },
  { name: 'Retainer check-in', description: 'Weekly sync and async project coordination', defaultQty: 400, defaultUnitPriceCents: 18000, currency: 'THB' },
] as const

const ITEM_TEMPLATE_GROUP_SEEDS = [
  { name: 'Brand Launch Package', description: 'Strategy, landing page, copy, and analytics for a first release.', color: 'purple', icon: '🚀', templateNames: ['Brand discovery workshop', 'Landing page design', 'Copy polish', 'Analytics setup'] },
  { name: 'Build Sprint', description: 'Implementation-focused bundle for an approved product surface.', color: 'blue', icon: '⚡', templateNames: ['Frontend implementation', 'SEO baseline', 'Analytics setup'] },
  { name: 'Content Refresh', description: 'Small refresh package for existing pages and marketing assets.', color: 'teal', icon: '✍️', templateNames: ['Copy polish', 'Product photography', 'SEO baseline'] },
  { name: 'Care Plan', description: 'Monthly support bundle for active client sites.', color: 'emerald', icon: '🛠️', templateNames: ['Monthly maintenance', 'Retainer check-in', 'Analytics setup'] },
  { name: 'Document Setup', description: 'Business admin setup for repeatable invoices and payment terms.', color: 'amber', icon: '📄', templateNames: ['Invoice setup', 'Copy polish'] },
  { name: 'Photo + Page', description: 'Simple product shoot paired with a focused sales page.', color: 'rose', icon: '📸', templateNames: ['Product photography', 'Landing page design', 'Copy polish'] },
] as const

async function seedItemLibrary(userId: string) {
  const existingTemplates = await db
    .select({ id: schema.itemTemplates.id })
    .from(schema.itemTemplates)
    .where(eq(schema.itemTemplates.userId, userId))
    .limit(1)

  const existingGroups = await db
    .select({ id: schema.itemTemplateGroups.id })
    .from(schema.itemTemplateGroups)
    .where(eq(schema.itemTemplateGroups.userId, userId))
    .limit(1)

  if (existingTemplates.length > 0 || existingGroups.length > 0) {
    console.log('  item library: skipped (templates or packages already exist)')
    return
  }

  const templates = await db
    .insert(schema.itemTemplates)
    .values(
      ITEM_TEMPLATE_SEEDS.map((seed, position) => ({
        userId,
        ...seed,
        position,
      })),
    )
    .returning({ id: schema.itemTemplates.id, name: schema.itemTemplates.name })

  const templateIdByName = new Map(templates.map((template) => [template.name, template.id]))

  const groups = await db
    .insert(schema.itemTemplateGroups)
    .values(
      ITEM_TEMPLATE_GROUP_SEEDS.map((seed, position) => ({
        userId,
        name: seed.name,
        description: seed.description,
        color: seed.color,
        icon: seed.icon,
        position,
      })),
    )
    .returning({ id: schema.itemTemplateGroups.id, name: schema.itemTemplateGroups.name })

  const members = ITEM_TEMPLATE_GROUP_SEEDS.flatMap((groupSeed, groupPosition) => {
    const group = groups[groupPosition]
    if (!group) return []
    return groupSeed.templateNames.flatMap((templateName, position) => {
      const templateId = templateIdByName.get(templateName)
      return templateId ? [{ groupId: group.id, templateId, position }] : []
    })
  })

  if (members.length > 0) {
    await db.insert(schema.itemTemplateGroupMembers).values(members)
  }

  console.log(`  item library: seeded ${templates.length} templates and ${groups.length} packages`)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const [user] = await db
  .select({ id: schema.users.id, email: schema.users.email })
  .from(schema.users)
  .where(eq(schema.users.email, emailArg))

if (!user) {
  console.error(`ERROR: no user found with email "${emailArg}". Sign up first.`)
  await sql.end()
  process.exit(1)
}

console.log(`Seeding for ${user.email} (${user.id})…`)
await seedRemarkTemplates(user.id)
await seedItemLibrary(user.id)
await seedContacts(user.id)
await seedProjects(user.id)
const wallets = await seedWallets(user.id)
await seedTransactions(user.id, wallets)
await seedStorageFolders(user.id)
await seedStorageFiles(user.id)
console.log('Done.')

await sql.end()
