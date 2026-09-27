import { env } from '@api/env'
import { AppError } from '@api/lib/errors'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import { lineConnections } from '@mana/db'
import { isLineConfigured, buildLineAddFriendUrl, buildLineSendCodeUrl } from '@api/lib/line/client'
import { generateLinkCode } from '@api/lib/line/link-code'

const LINK_CODE_TTL_MS = 15 * 60 * 1000

export type LineConnectionDto = {
  connected: boolean
  displayName: string | null
  pending: boolean
  addFriendUrl: string | null
  sendCodeUrl: string | null
  linkCode: string | null
  expiresAt: string | null
  lineConfigured: boolean
}

function toDto(connection: typeof lineConnections.$inferSelect | undefined): LineConnectionDto {
  const lineConfigured = isLineConfigured() && Boolean(env.LINE_OA_ID)
  if (!connection) {
    return { connected: false, displayName: null, pending: false, addFriendUrl: null, sendCodeUrl: null, linkCode: null, expiresAt: null, lineConfigured }
  }
  const pending = !connection.lineUserId && !!connection.linkCode && !!connection.linkCodeExpiresAt && connection.linkCodeExpiresAt > new Date()
  return {
    connected: !!connection.lineUserId,
    displayName: connection.displayName,
    pending,
    addFriendUrl: pending ? buildLineAddFriendUrl() : null,
    sendCodeUrl: pending && connection.linkCode ? buildLineSendCodeUrl(connection.linkCode) : null,
    linkCode: pending ? connection.linkCode : null,
    expiresAt: pending ? (connection.linkCodeExpiresAt?.toISOString() ?? null) : null,
    lineConfigured,
  }
}

export async function getLineConnection(userId: string): Promise<LineConnectionDto> {
  const [connection] = await db.select().from(lineConnections).where(eq(lineConnections.userId, userId))
  return toDto(connection)
}

export async function startLineConnection(userId: string): Promise<LineConnectionDto> {
  if (!isLineConfigured() || !env.LINE_OA_ID) throw new AppError('LINE is not configured', 503)
  const linkCode = generateLinkCode()
  const linkCodeExpiresAt = new Date(Date.now() + LINK_CODE_TTL_MS)
  const [connection] = await db
    .insert(lineConnections)
    .values({ userId, linkCode, linkCodeExpiresAt })
    .onConflictDoUpdate({
      target: lineConnections.userId,
      set: { linkCode, linkCodeExpiresAt, updatedAt: new Date() },
    })
    .returning()
  return toDto(connection)
}

export async function disconnectLine(userId: string) {
  await db.delete(lineConnections).where(eq(lineConnections.userId, userId))
}
