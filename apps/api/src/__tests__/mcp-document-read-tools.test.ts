import { afterAll, describe, expect, it, mock } from 'bun:test'
import { documentItems, documents, users } from '@mana/db'
import { inArray } from 'drizzle-orm'
import { db } from '@api/db'

const publishDocumentMock = mock(async () => ({ document: null, emailStatus: undefined }))

mock.module('../modules/documents/publication', () => ({ publishDocument: publishDocumentMock }))

const { documentHandlers, documentTools } = await import('@api/utils/mcp-tools/documents')

const createdUserIds: string[] = []

async function createUser(name: string) {
  const [user] = await db
    .insert(users)
    .values({ name, email: `mcp-document-read-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

async function createDocument(userId: string, number: string, overrides: Partial<typeof documents.$inferInsert> = {}) {
  const [document] = await db
    .insert(documents)
    .values({
      userId,
      type: 'QO',
      status: 'draft',
      number,
      currency: 'THB',
      subtotalCents: 1_000,
      totalCents: 1_000,
      amountDueCents: 1_000,
      issueDate: '2026-08-05',
      clientName: 'Acme Co.',
      ...overrides,
    })
    .returning()
  return document
}

function tool(name: string) {
  const found = documentTools.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`Missing ${name}`)
  return found
}

afterAll(async () => {
  if (createdUserIds.length === 0) return
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(inArray(documents.userId, createdUserIds))
  const documentIds = rows.map((row) => row.id)
  if (documentIds.length > 0) await db.delete(documentItems).where(inArray(documentItems.documentId, documentIds))
  await db.delete(documents).where(inArray(documents.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('document read MCP tools', () => {
  it('declares a bounded list and a no-email publish action', () => {
    expect(tool('list_documents').input_schema).toMatchObject({
      properties: {
        page: { minimum: 1, maximum: 1_000 },
        limit: { minimum: 1, maximum: 50 },
      },
    })
    expect(tool('publish_document').input_schema).toMatchObject({
      required: ['documentId'],
      properties: { confirmPublish: { type: 'boolean' } },
    })
    expect(tool('publish_document').input_schema.properties).not.toHaveProperty('sendEmail')
  })

  it('returns a bounded document page with IDs and statuses', async () => {
    const user = await createUser('Document list owner')
    await createDocument(user.id, 'QO-READ-001')
    await createDocument(user.id, 'QO-READ-002')

    const result = await documentHandlers['list_documents'](user.id, { limit: 1 }) as {
      items: Array<{ id: string; status: string }>
      limit: number
      hasMore: boolean
    }

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toEqual(expect.any(String))
    expect(result.items[0]?.status).toBe('draft')
    expect(result.limit).toBe(1)
    expect(result.hasMore).toBe(true)
    await expect(documentHandlers['list_documents'](user.id, { limit: 51 })).rejects.toThrow('limit')
    await expect(documentHandlers['list_documents'](user.id, { page: 1_001 })).rejects.toThrow('page')
  })

  it('returns a safe, bounded detail projection for the owning user only', async () => {
    const owner = await createUser('Document detail owner')
    const otherUser = await createUser('Other document user')
    const document = await createDocument(owner.id, 'QO-DETAIL-001', {
      clientEmail: 'billing@acme.example',
      accountNumber: '123-456-7890',
      publicToken: 'private-public-token',
      pdfR2Key: 'documents/private.pdf',
      remark: 'x'.repeat(1_050),
    })
    await db.insert(documentItems).values(
      Array.from({ length: 51 }, (_, position) => ({
        documentId: document.id,
        description: `Line ${position + 1}`,
        quantity: 100,
        unitPriceCents: 1_000,
        subtotalCents: 1_000,
        position,
      })),
    )

    const result = await documentHandlers['get_document'](owner.id, { documentId: document.id }) as {
      id: string
      items: Array<{ quantity: number }>
      itemCount: number
      hasMoreItems: boolean
      remark: string | null
      remarkTruncated: boolean
    }

    expect(result).toMatchObject({
      id: document.id,
      itemCount: 51,
      hasMoreItems: true,
      remarkTruncated: true,
    })
    expect(result.items).toHaveLength(50)
    expect(result.items[0]?.quantity).toBe(1)
    expect(result.remark).toHaveLength(1_000)
    expect(result).not.toHaveProperty('publicToken')
    expect(result).not.toHaveProperty('pdfR2Key')
    expect(result).not.toHaveProperty('accountNumber')
    expect(result).not.toHaveProperty('clientEmail')
    await expect(documentHandlers['get_document'](otherUser.id, { documentId: document.id })).rejects.toThrow()
  })

  it('publishes through the existing service with email explicitly disabled', async () => {
    const user = await createUser('Document publish owner')
    const document = await createDocument(user.id, 'QO-PUBLISH-001')

    await documentHandlers['publish_document'](user.id, { documentId: document.id })

    expect(publishDocumentMock).toHaveBeenCalledWith(user.id, document.id, { sendEmail: false })

    await expect(documentHandlers['publish_document'](user.id, {
      documentId: document.id,
    }, { source: 'external-mcp' })).rejects.toThrow('confirmPublish')
  })
})
