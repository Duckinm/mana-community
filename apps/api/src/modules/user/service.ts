import { db } from '@api/db'
import {
  users,
  contacts,
  projects,
  tasks,
  transactions,
  wallets,
  documents,
  documentItems,
  documentVersions,
  budgets,
  categories,
  senderProfiles,
  itemTemplates,
  itemTemplateGroups,
  itemTemplateGroupMembers,
  storageFolders,
  storageFiles,
  chatSessions,
  chatMessages,
  type NotificationPreferences,
} from '@mana/db'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { resolvePublicAssetUrl, extractR2Key } from '@api/utils/r2/public-url'
import { r2, R2_BUCKET } from '@api/utils/r2'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { userToWire } from '@api/modules/user/wire'

interface UpdateUserContextArgs {
  hourlyRate?: number
  currency?: string
  revenueGoal?: number
  freelancerType?: string
  aiTone?: string
  name?: string
}

function withResolvedImage<T extends { image: string | null }>(user: T): T {
  if (!user.image) return user
  return { ...user, image: resolvePublicAssetUrl(user.image) }
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user ? userToWire(withResolvedImage(user)) : null
}

export async function getStartedStatus(userId: string) {
  const [contactRow, projectRow, documentRow, transactionRow, userRow] = await Promise.all([
    db.select({ id: contacts.id }).from(contacts).where(eq(contacts.userId, userId)).limit(1),
    db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt))).limit(1),
    db.select({ id: documents.id }).from(documents)
      .where(and(eq(documents.userId, userId), isNull(documents.deletedAt))).limit(1),
    db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, userId)).limit(1),
    db
      .select({
        freelancerType: users.freelancerType,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ])

  return {
    hasContact: contactRow.length > 0,
    hasProject: projectRow.length > 0,
    hasDocument: documentRow.length > 0,
    hasTransaction: transactionRow.length > 0,
    hasProfile: Boolean(userRow[0]?.freelancerType?.trim()),
  }
}

export async function updateUser(
  userId: string,
  body: Record<string, unknown> & { onboardedAt?: string | null },
) {
  const { onboardedAt, notificationPreferences, ...rest } = body
  const [updated] = await db
    .update(users)
    .set({
      ...(rest as Partial<typeof users.$inferInsert>),
      ...(onboardedAt !== undefined
        ? { onboardedAt: onboardedAt ? new Date(onboardedAt) : null }
        : {}),
      ...(notificationPreferences !== undefined
        ? {
            notificationPreferences: sql<NotificationPreferences>`
              ${users.notificationPreferences} || ${JSON.stringify(notificationPreferences)}::jsonb
            `,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
  return updated ? userToWire(withResolvedImage(updated)) : null
}

export async function deleteUser(userId: string) {
  const [storageFileRows, documentRows, itemTemplateRows, userRow] = await Promise.all([
    db.select({ r2Key: storageFiles.r2Key }).from(storageFiles).where(eq(storageFiles.userId, userId)),
    db.select({ pdfR2Key: documents.pdfR2Key }).from(documents).where(eq(documents.userId, userId)),
    db.select({ imageR2Key: itemTemplates.imageR2Key }).from(itemTemplates).where(eq(itemTemplates.userId, userId)),
    db.select({ image: users.image }).from(users).where(eq(users.id, userId)),
  ])

  const r2Keys: string[] = [
    ...storageFileRows.map((f) => f.r2Key),
    ...documentRows.flatMap((d) => (d.pdfR2Key ? [d.pdfR2Key] : [])),
    ...itemTemplateRows.flatMap((t) => (t.imageR2Key ? [t.imageR2Key] : [])),
  ]

  const avatarImage = userRow[0]?.image
  if (avatarImage) {
    const avatarKey = extractR2Key(avatarImage)
    if (avatarKey) r2Keys.push(avatarKey)
  }

  await Promise.all(
    r2Keys.map((key) =>
      r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(() => null),
    ),
  )

  await db.delete(users).where(eq(users.id, userId))
}

export async function exportUser(userId: string) {
  const [
    profileRows,
    contactRows,
    projectRows,
    taskRows,
    transactionRows,
    walletRows,
    documentRows,
    documentItemRows,
    documentVersionRows,
    budgetRows,
    categoryRows,
    senderProfileRows,
    itemTemplateRows,
    itemTemplateGroupRows,
    itemTemplateGroupMemberRows,
    storageFolderRows,
    storageFileRows,
    chatSessionRows,
    chatMessageRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db.select().from(contacts).where(eq(contacts.userId, userId)),
    db.select().from(projects).where(eq(projects.userId, userId)),
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(transactions).where(eq(transactions.userId, userId)),
    db.select().from(wallets).where(eq(wallets.userId, userId)),
    db.select().from(documents).where(eq(documents.userId, userId)),
    db.select().from(documentItems),
    db.select().from(documentVersions),
    db.select().from(budgets).where(eq(budgets.userId, userId)),
    db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(senderProfiles).where(eq(senderProfiles.userId, userId)),
    db.select().from(itemTemplates).where(eq(itemTemplates.userId, userId)),
    db.select().from(itemTemplateGroups).where(eq(itemTemplateGroups.userId, userId)),
    db.select().from(itemTemplateGroupMembers),
    db.select().from(storageFolders).where(eq(storageFolders.userId, userId)),
    db.select().from(storageFiles).where(eq(storageFiles.userId, userId)),
    db.select().from(chatSessions).where(eq(chatSessions.userId, userId)),
    db.select().from(chatMessages).where(eq(chatMessages.userId, userId)),
  ])

  const profile = profileRows[0]
  if (!profile) return null

  const { mcpToken: _mcpToken, mcpTokenRotatedAt: _mcpTokenRotatedAt, ...safeProfile } = profile

  const userDocumentIds = new Set(documentRows.map((d) => d.id))
  const userGroupIds = new Set(itemTemplateGroupRows.map((g) => g.id))
  const userSessionIds = new Set(chatSessionRows.map((s) => s.id))

  const itemsByDocument = new Map<string, typeof documentItemRows>()
  for (const item of documentItemRows) {
    if (!userDocumentIds.has(item.documentId)) continue
    const existing = itemsByDocument.get(item.documentId) ?? []
    existing.push(item)
    itemsByDocument.set(item.documentId, existing)
  }

  const versionsByDocument = new Map<string, typeof documentVersionRows>()
  for (const version of documentVersionRows) {
    if (!userDocumentIds.has(version.documentId)) continue
    const existing = versionsByDocument.get(version.documentId) ?? []
    existing.push(version)
    versionsByDocument.set(version.documentId, existing)
  }

  const membersByGroup = new Map<string, typeof itemTemplateGroupMemberRows>()
  for (const member of itemTemplateGroupMemberRows) {
    if (!userGroupIds.has(member.groupId)) continue
    const existing = membersByGroup.get(member.groupId) ?? []
    existing.push(member)
    membersByGroup.set(member.groupId, existing)
  }

  const messagesBySession = new Map<string, typeof chatMessageRows>()
  for (const message of chatMessageRows) {
    if (!message.sessionId || !userSessionIds.has(message.sessionId)) continue
    const existing = messagesBySession.get(message.sessionId) ?? []
    existing.push(message)
    messagesBySession.set(message.sessionId, existing)
  }

  return {
    exportedAt: new Date().toISOString(),
    version: 1 as const,
    profile: safeProfile,
    contacts: contactRows,
    projects: projectRows,
    tasks: taskRows,
    transactions: transactionRows,
    wallets: walletRows,
    documents: documentRows.map((doc) => ({
      ...doc,
      items: itemsByDocument.get(doc.id) ?? [],
      versions: versionsByDocument.get(doc.id) ?? [],
    })),
    budgets: budgetRows,
    categories: categoryRows,
    senderProfiles: senderProfileRows,
    itemTemplates: itemTemplateRows,
    itemTemplateGroups: itemTemplateGroupRows.map((group) => ({
      ...group,
      members: membersByGroup.get(group.id) ?? [],
    })),
    storageFolders: storageFolderRows,
    storageFiles: storageFileRows,
    chatSessions: chatSessionRows.map((session) => ({
      ...session,
      messages: messagesBySession.get(session.id) ?? [],
    })),
  }
}

export async function queryUserContext(userId: string) {
  const [user] = await db
    .select({
      name: users.name,
      email: users.email,
      hourlyRate: users.hourlyRate,
      currency: users.currency,
      revenueGoal: users.revenueGoal,
      freelancerType: users.freelancerType,
      aiTone: users.aiTone,
    })
    .from(users)
    .where(eq(users.id, userId))
  return user ?? null
}

export async function updateUserContext(userId: string, args: UpdateUserContextArgs) {
  const patch: {
    name?: string
    currency?: string
    freelancerType?: string
    aiTone?: string
    hourlyRate?: string
    revenueGoal?: string
    updatedAt?: Date
  } = {}
  if (args.name !== undefined) patch.name = args.name
  if (args.currency !== undefined) patch.currency = args.currency
  if (args.freelancerType !== undefined) patch.freelancerType = args.freelancerType
  if (args.aiTone !== undefined) patch.aiTone = args.aiTone
  if (args.hourlyRate !== undefined) patch.hourlyRate = String(args.hourlyRate)
  if (args.revenueGoal !== undefined) patch.revenueGoal = String(args.revenueGoal)

  if (Object.keys(patch).length === 0) return { updated: false }
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning({
      name: users.name,
      email: users.email,
      hourlyRate: users.hourlyRate,
      currency: users.currency,
      revenueGoal: users.revenueGoal,
      freelancerType: users.freelancerType,
      aiTone: users.aiTone,
    })
  return updated ?? { updated: false }
}

export async function queryAiSettings(userId: string) {
  const [user] = await db
    .select({
      aiMemory: users.aiMemory,
      aiProactive: users.aiProactive,
      aiVoiceEnabled: users.aiVoiceEnabled,
      aiTone: users.aiTone,
    })
    .from(users)
    .where(eq(users.id, userId))
  return user ?? null
}

export async function updateAiSettings(
  userId: string,
  args: { aiMemory?: boolean; aiProactive?: boolean; aiVoiceEnabled?: boolean; aiTone?: string },
) {
  const patch: {
    aiMemory?: boolean
    aiProactive?: boolean
    aiVoiceEnabled?: boolean
    aiTone?: string
    updatedAt?: Date
  } = {}

  if (args.aiMemory !== undefined) patch.aiMemory = args.aiMemory
  if (args.aiProactive !== undefined) patch.aiProactive = args.aiProactive
  if (args.aiVoiceEnabled !== undefined) patch.aiVoiceEnabled = args.aiVoiceEnabled
  if (args.aiTone !== undefined) patch.aiTone = args.aiTone

  if (Object.keys(patch).length === 0) return { updated: false }
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))
    .returning({
      aiMemory: users.aiMemory,
      aiProactive: users.aiProactive,
      aiVoiceEnabled: users.aiVoiceEnabled,
      aiTone: users.aiTone,
    })
  return updated ?? { updated: false }
}
