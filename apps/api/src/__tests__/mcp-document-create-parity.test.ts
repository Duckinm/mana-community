import { afterAll, describe, expect, it } from 'bun:test'
import { and, eq, inArray } from 'drizzle-orm'
import { contacts, documentItems, documents, senderProfiles, users } from '@mana/db'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(inArray(documents.userId, createdUserIds))
  const documentIds = rows.map((row) => row.id)
  if (documentIds.length > 0) await db.delete(documentItems).where(inArray(documentItems.documentId, documentIds))
  await db.delete(documents).where(inArray(documents.userId, createdUserIds))
  await db.delete(senderProfiles).where(inArray(senderProfiles.userId, createdUserIds))
  await db.delete(contacts).where(inArray(contacts.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'MCP parity test', email: `mcp-document-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

describe('MCP document creation parity', () => {
  it('rejects a quotation that the document workflow would block', async () => {
    const user = await createUser()

    await expect(executeToolCall(user.id, 'create_document', {
      type: 'QO',
      items: [],
    })).rejects.toThrow('sender profile or sender name')
  })

  it('hydrates a saved sender and contact just as the document workflow does', async () => {
    const user = await createUser()
    const [sender] = await db
      .insert(senderProfiles)
      .values({
        userId: user.id,
        name: 'Patiparn Studio',
        registeredName: 'Patiparn Studio Co., Ltd.',
        yourPhone: '+66 81 111 2222',
      })
      .returning()
    const [contact] = await db
      .insert(contacts)
      .values({
        userId: user.id,
        name: 'Acme Company',
        companyNameEn: 'Acme Co., Ltd.',
        phone: '+66 81 333 4444',
      })
      .returning()

    const created = await executeToolCall(user.id, 'create_document', {
      type: 'QO',
      senderProfileId: sender.id,
      contactId: contact.id,
      items: [{ description: 'Strategy workshop', quantity: 1, unitPriceCents: 150000 }],
    }) as { id: string; amountDue: number }

    expect(created.amountDue).toBe(1500)

    const [stored] = await db
      .select({
        registeredName: documents.registeredName,
        clientName: documents.clientName,
        clientPhone: documents.clientPhone,
      })
      .from(documents)
      .where(and(eq(documents.id, created.id), eq(documents.userId, user.id)))

    expect(stored).toEqual({
      registeredName: 'Patiparn Studio Co., Ltd.',
      clientName: 'Acme Co., Ltd.',
      clientPhone: '+66 81 333 4444',
    })
  })
})
