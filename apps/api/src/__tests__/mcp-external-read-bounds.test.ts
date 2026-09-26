import { afterAll, describe, expect, it } from 'bun:test'
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { contacts, fileLinks, storageFiles, storageFolders, users } from '@mana/db'
import { inArray } from 'drizzle-orm'
import { db } from '@api/db'
import { buildMcpServer } from '@api/modules/mcp/service'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

async function createReadFixture() {
  const [user] = await db
    .insert(users)
    .values({ name: 'MCP read bounds test', email: `mcp-read-bounds-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)

  const contactRows = await db
    .insert(contacts)
    .values(Array.from({ length: 51 }, (_, index) => ({
      userId: user.id,
      name: `Bounded contact ${String(index).padStart(3, '0')}`,
      initials: 'BC',
      company: 'Bounded Co',
    })))
    .returning({ id: contacts.id })
  const fileRows = await db
    .insert(storageFiles)
    .values(Array.from({ length: 51 }, (_, index) => ({
      userId: user.id,
      name: `bounded-file-${String(index).padStart(3, '0')}.txt`,
      kind: 'document',
      sizeBytes: 1,
      r2Key: `mcp-read-bounds/${user.id}/${index}`,
    })))
    .returning({ id: storageFiles.id })

  await Promise.all([
    db.insert(storageFolders).values(Array.from({ length: 51 }, (_, index) => ({
      userId: user.id,
      name: `Bounded folder ${String(index).padStart(3, '0')}`,
    }))),
    db.insert(fileLinks).values(fileRows.map((file) => ({
      fileId: file.id,
      entityType: 'contact',
      entityId: contactRows[0]!.id,
    }))),
  ])

  return { user, contactId: contactRows[0]!.id }
}

describe('external MCP read bounds', () => {
  it('returns bounded envelopes for public contact and storage collections', async () => {
    const { user, contactId } = await createReadFixture()
    const external = { source: 'external-mcp' as const }

    const [contactsResult, filesResult, foldersResult, searchResult, entityFilesResult] = await Promise.all([
      executeToolCall(user.id, 'get_contacts', {}, external),
      executeToolCall(user.id, 'list_files', {}, external),
      executeToolCall(user.id, 'list_folders', {}, external),
      executeToolCall(user.id, 'search_files', { query: 'bounded-file' }, external),
      executeToolCall(user.id, 'list_files_by_entity', { entityType: 'contact', entityId: contactId }, external),
    ])

    for (const result of [contactsResult, filesResult, foldersResult, searchResult, entityFilesResult]) {
      expect(result).toMatchObject({ limit: 50, hasMore: true })
    }
    expect((contactsResult as { items: unknown[] }).items).toHaveLength(50)
    expect((filesResult as { items: unknown[] }).items).toHaveLength(50)

    const chatContacts = await executeToolCall(user.id, 'get_contacts', {}, { source: 'chat' })
    expect(chatContacts).toHaveLength(51)
  })

  it('rejects oversized public reads and denies external contact exports', async () => {
    const server = buildMcpServer('user-1') as unknown as {
      _requestHandlers: Map<string, (request: unknown) => Promise<unknown>>
    }
    const call = server._requestHandlers.get(CallToolRequestSchema.shape.method.value)!
    const oversized = await call({
      method: 'tools/call',
      params: { name: 'get_contacts', arguments: { limit: 101 } },
    }) as { isError?: boolean; content: { text: string }[] }

    expect(oversized.isError).toBe(true)
    expect(oversized.content[0]!.text).toContain('Invalid arguments for get_contacts')

    const privateTool = await call({
      method: 'tools/call',
      params: { name: 'get_email_logs', arguments: {} },
    }) as { isError?: boolean; content: { text: string }[] }

    expect(privateTool.isError).toBe(true)
    expect(privateTool.content[0]!.text).toContain('Unknown or unavailable tool: get_email_logs')

    const { user } = await createReadFixture()
    await expect(executeToolCall(user.id, 'export_contacts', {}, { source: 'external-mcp' }))
      .rejects.toThrow('only available in the MANA app')
  })
})
