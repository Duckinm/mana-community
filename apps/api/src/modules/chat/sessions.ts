import { chatMessages, chatSessions } from '@mana/db'
import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '@api/db'
import { chatMessageToWire, chatSessionCreatedToWire, chatSessionToWire } from '@api/modules/chat/wire'

type ChatRow = typeof chatMessages.$inferSelect

export async function getChatHistory(userId: string) {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(50)

  return rows.map((row: ChatRow) => chatMessageToWire(row))
}

export async function clearChatHistory(userId: string) {
  await db.delete(chatMessages).where(eq(chatMessages.userId, userId))
}

export async function getSessions(userId: string) {
  const rows = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      titleGeneratedAt: chatSessions.titleGeneratedAt,
      pinned: chatSessions.pinned,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      messageCount: count(chatMessages.id),
    })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(eq(chatSessions.userId, userId))
    .groupBy(chatSessions.id)
    .orderBy(desc(chatSessions.pinned), desc(chatSessions.updatedAt))

  return rows.map(chatSessionToWire)
}

export async function updateSessionPinned(userId: string, sessionId: string, pinned: boolean) {
  const owned = await verifySessionOwnership(userId, sessionId)
  if (!owned) return null

  const [updated] = await db
    .update(chatSessions)
    .set({ pinned })
    .where(eq(chatSessions.id, sessionId))
    .returning({ id: chatSessions.id, pinned: chatSessions.pinned })

  return updated ?? null
}

export async function createSession(userId: string, title?: string) {
  const [session] = await db
    .insert(chatSessions)
    .values({ userId, title: title ?? 'New Chat' })
    .returning({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
    })

  return chatSessionCreatedToWire(session)
}

export async function deleteSession(userId: string, sessionId: string) {
  const owned = await verifySessionOwnership(userId, sessionId)
  if (!owned) return null

  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId))
  return { success: true }
}

export async function updateSessionTitle(userId: string, sessionId: string, title: string) {
  const owned = await verifySessionOwnership(userId, sessionId)
  if (!owned) return null

  const [updated] = await db
    .update(chatSessions)
    .set({ title, updatedAt: sql`NOW()` })
    .where(eq(chatSessions.id, sessionId))
    .returning({ id: chatSessions.id, title: chatSessions.title })

  return updated ?? null
}

export async function getSessionMessages(userId: string, sessionId: string) {
  const owned = await verifySessionOwnership(userId, sessionId)
  if (!owned) return null

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))

  return rows.map((row: ChatRow) => chatMessageToWire(row))
}

export async function verifySessionOwnership(userId: string, sessionId: string): Promise<boolean> {
  const [session] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))

  return session?.userId === userId
}

export async function searchSessions(userId: string, query: string) {
  const rows = await db
    .select({
      sessionId: chatMessages.sessionId,
      content: chatMessages.content,
      sessionTitle: chatSessions.title,
      sessionUpdatedAt: chatSessions.updatedAt,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(sql`${chatMessages.userId} = ${userId} AND ${chatMessages.content} ILIKE ${`%${query}%`}`)
    .orderBy(desc(chatMessages.createdAt))
    .limit(20)

  const seen = new Set<string>()
  const results: Array<{
    sessionId: string
    sessionTitle: string
    snippet: string
    sessionUpdatedAt: string
  }> = []

  for (const row of rows) {
    if (!row.sessionId || seen.has(row.sessionId)) continue
    seen.add(row.sessionId)
    const index = row.content.toLowerCase().indexOf(query.toLowerCase())
    const start = Math.max(0, index - 40)
    const end = Math.min(row.content.length, index + query.length + 80)
    const snippet = `${start > 0 ? '…' : ''}${row.content.slice(start, end)}${end < row.content.length ? '…' : ''}`
    results.push({
      sessionId: row.sessionId,
      sessionTitle: row.sessionTitle,
      snippet,
      sessionUpdatedAt: row.sessionUpdatedAt.toISOString(),
    })
  }

  return results
}
