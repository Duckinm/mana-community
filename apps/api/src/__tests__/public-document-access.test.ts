import { afterEach, describe, expect, it } from 'bun:test'
import { documents, users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { db } from '@api/db'
import {
  approveDocumentByToken,
  getDocumentByPublicToken,
  markDocumentViewed,
  rejectDocumentByToken,
} from '@api/modules/documents/public-access'
import { documentsModule } from '@api/modules/documents'
import { revokeDocumentPublicLink, rotateDocumentPublicLink } from '@api/modules/documents/service'
import { getDocumentPdfUrlByToken } from '@api/modules/documents/publication'
import { resolveDocumentIdByToken } from '@api/modules/payment-slips/service'
import { addCalendarDays, todayCalendarDate } from '@api/lib/calendar-date'

const createdUserIds: string[] = []

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('public document access', () => {
  it('keeps owner previews inert and records a client approval through the public interface', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Public Access Test', email: `public-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    const [document] = await db
      .insert(documents)
      .values({ userId: user.id, type: 'INV', status: 'published', number: 'INV-PUBLIC-001' })
      .returning()
    const token = document.publicToken!

    expect((await getDocumentByPublicToken(token, user.id))?.isOwner).toBe(true)
    expect(await markDocumentViewed(token, user.id)).toBe(true)

    const [afterPreview] = await db.select().from(documents).where(eq(documents.id, document.id))
    expect(afterPreview.viewedAt).toBeNull()
    expect(afterPreview.clientStatus).toBeNull()

    expect(await approveDocumentByToken(token, '203.0.113.5')).toBe(true)
    const [approved] = await db.select().from(documents).where(eq(documents.id, document.id))
    expect(approved.clientStatus).toBe('client_approved')
    expect(approved.clientApprovalIp).toBe('203.0.113.5')
  })

  it('makes guest document responses private and limits repeated view updates', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Public Document HTTP Test', email: `public-http-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    const [document] = await db
      .insert(documents)
      .values({ userId: user.id, type: 'INV', status: 'published', number: 'INV-PUBLIC-HTTP-001' })
      .returning()
    const token = document.publicToken!
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`

    const getResponse = await documentsModule.handle(new Request(`http://localhost/api/documents/view/${token}`, {
      headers: { 'x-forwarded-for': ip },
    }))
    expect(getResponse.status).toBe(200)
    expect(getResponse.headers.get('cache-control')).toBe('private, no-store')
    expect(getResponse.headers.get('referrer-policy')).toBe('no-referrer')
    expect(getResponse.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive')

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await documentsModule.handle(new Request(`http://localhost/api/documents/view/${token}/viewed`, {
        method: 'PATCH',
        headers: { 'x-forwarded-for': ip },
      }))
      expect(response.status).toBe(204)
    }

    const limited = await documentsModule.handle(new Request(`http://localhost/api/documents/view/${token}/viewed`, {
      method: 'PATCH',
      headers: { 'x-forwarded-for': ip },
    }))
    expect(limited.status).toBe(429)
    expect(limited.headers.get('cache-control')).toBe('private, no-store')
  })

  it('makes a quotation unavailable after its validity date across guest endpoints', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Expired Quote Test', email: `expired-quote-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    const [document] = await db
      .insert(documents)
      .values({
        userId: user.id,
        type: 'QO',
        status: 'published',
        number: 'QO-EXPIRED-001',
        validUntilDate: addCalendarDays(todayCalendarDate(), -1),
      })
      .returning()
    const token = document.publicToken!

    expect(await getDocumentByPublicToken(token)).toBeNull()
    expect(await markDocumentViewed(token)).toBe(false)
    expect(await approveDocumentByToken(token, '203.0.113.8')).toBe(false)
    expect(await rejectDocumentByToken(token)).toBe(false)
    expect(await resolveDocumentIdByToken(token)).toBeNull()
    await expect(getDocumentPdfUrlByToken(token)).rejects.toThrow()

    const response = await documentsModule.handle(new Request(`http://localhost/api/documents/view/${token}`))
    expect(response.status).toBe(404)
  })

  it.each([
    { plan: 'free', hideBranding: false, expected: true },
    { plan: 'free', hideBranding: true, expected: true },
    { plan: 'mana', hideBranding: false, expected: true },
    { plan: 'mana', hideBranding: true, expected: false },
    { plan: 'aether', hideBranding: true, expected: false },
  ])('shows guest branding=$expected for a $plan owner with hideBranding=$hideBranding', async ({ plan, hideBranding, expected }) => {
    const [user] = await db
      .insert(users)
      .values({
        name: 'Branding Test',
        email: `branding-${crypto.randomUUID()}@example.com`,
        plan,
        hideBranding,
      })
      .returning()
    createdUserIds.push(user.id)

    const [document] = await db
      .insert(documents)
      .values({ userId: user.id, type: 'INV', status: 'published', number: `INV-BRAND-${crypto.randomUUID().slice(0, 8)}` })
      .returning()

    const guest = await getDocumentByPublicToken(document.publicToken!)
    expect(guest?.showBranding).toBe(expected)
  })

  it('rotates and revokes invoice links without expiring them automatically', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Lifecycle Test', email: `lifecycle-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)

    const [document] = await db
      .insert(documents)
      .values({ userId: user.id, type: 'INV', status: 'published', number: 'INV-LIFECYCLE-001' })
      .returning()
    const previousToken = document.publicToken!

    const rotated = await rotateDocumentPublicLink(user.id, document.id)
    expect(rotated.publicToken).not.toBe(previousToken)
    expect(rotated.publicAccessRotatedAt).not.toBeNull()
    expect(await getDocumentByPublicToken(previousToken)).toBeNull()
    expect(await getDocumentByPublicToken(rotated.publicToken!)).not.toBeNull()

    const revoked = await revokeDocumentPublicLink(user.id, document.id)
    expect(revoked.publicAccessRevokedAt).not.toBeNull()
    expect(await getDocumentByPublicToken(rotated.publicToken!)).toBeNull()
    expect(await resolveDocumentIdByToken(rotated.publicToken!)).toBeNull()
  })
})
