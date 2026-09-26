import { afterAll, describe, expect, it } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { senderProfiles, users } from '@mana/db'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(senderProfiles).where(inArray(senderProfiles.userId, createdUserIds))
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('MCP sender profile projection', () => {
  it('keeps external sender profiles minimal and bounded while preserving chat detail', async () => {
    const [user] = await db.insert(users).values({
      name: 'MCP sender projection',
      email: `mcp-sender-${crypto.randomUUID()}@example.com`,
    }).returning()
    createdUserIds.push(user.id)

    const [sender] = await db.insert(senderProfiles).values({
      userId: user.id,
      name: 'Patiparn Studio',
      registeredName: 'Patiparn Studio Co., Ltd.',
      registeredAddress: 'Bangkok',
      yourTaxId: '1234567890123',
      defaultDueDaysOffset: 14,
      yourEmail: 'private@example.com',
      yourPhone: '+66 81 123 4567',
      yourLogo: 'https://private.example/logo.png',
      signatureImage: 'https://private.example/signature.png',
      etaxEnabled: true,
      defaultRemark: 'Private payment instructions',
    }).returning()
    await db.insert(senderProfiles).values({
      userId: user.id,
      name: 'Second sender',
    })

    const external = { source: 'external-mcp' as const }
    const listed = await executeToolCall(user.id, 'get_sender_profiles', { limit: 1 }, external) as {
      items: Record<string, unknown>[]
      limit: number
      hasMore: boolean
    }
    const updated = await executeToolCall(user.id, 'update_sender_profile', {
      id: sender.id,
      name: 'Patiparn Studio Updated',
    }, external) as Record<string, unknown>
    const chatProfiles = await executeToolCall(user.id, 'get_sender_profiles', {}, { source: 'chat' }) as Record<string, unknown>[]

    expect(listed.limit).toBe(1)
    expect(listed.hasMore).toBe(true)
    expect(listed.items).toHaveLength(1)
    expect(updated).toMatchObject({
      id: sender.id,
      defaultDueDaysOffset: 14,
    })

    for (const profile of [listed.items[0], updated]) {
      expect(Object.keys(profile).sort()).toEqual([
        'defaultDueDaysOffset',
        'defaultDueDaysQo',
        'defaultDueDaysRc',
        'defaultTaxRateBps',
        'documentLanguage',
        'entityType',
        'id',
        'isDefault',
        'name',
        'vatRegistered',
      ])
      for (const key of [
        'yourLogo', 'signatureImage', 'etaxFromEmail', 'etaxEnabled', 'yourEmail', 'yourPhone',
        'defaultRemark', 'registeredName', 'registeredAddress', 'yourTaxId', 'yourBranchNumber',
      ]) {
        expect(profile).not.toHaveProperty(key)
      }
      expect(JSON.stringify(profile)).not.toContain('private.example')
      expect(JSON.stringify(profile)).not.toContain('etax-')
    }

    const chatProfile = chatProfiles.find((profile) => profile.id === sender.id)
    expect(chatProfile).toMatchObject({
      yourLogo: 'https://private.example/logo.png',
      signatureImage: 'https://private.example/signature.png',
      yourEmail: 'private@example.com',
      yourTaxId: '1234567890123',
      etaxEnabled: true,
    })
    expect(chatProfile).toHaveProperty('etaxFromEmail')
  })
})
