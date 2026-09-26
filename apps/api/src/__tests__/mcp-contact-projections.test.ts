import { afterAll, describe, expect, it } from 'bun:test'
import { activityLogs, contacts, users } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@api/db'
import { executeToolCall } from '@api/utils/mcp-tools'
import { projectExternalMcpContact, projectExternalMcpContactActivity } from '@api/utils/mcp-tools/contacts'

const createdUserIds: string[] = []

afterAll(async () => {
  if (createdUserIds.length === 0) return
  await db.delete(users).where(inArray(users.id, createdUserIds))
})

describe('external MCP contact projections', () => {
  it('keeps workflow fields while excluding sensitive contact and activity data', () => {
    const contact = projectExternalMcpContact({
      id: 'contact-1',
      name: 'Ava Sensitive',
      role: 'Director',
      company: 'Example Co',
      email: 'ava@example.com',
      phone: '+66 812345678',
      tags: ['vip'],
      relationshipLevel: 4,
      stage: 'client',
      dealStatus: 'won',
      lastContactedAt: '2026-08-05T00:00:00.000Z',
      activeProjectCount: 2,
      totalBilledCents: 125_000,
      notes: 'private negotiation notes',
      website: 'https://private.example.com',
      imageUrl: 'https://private.example.com/avatar.png',
      address: '99 Private Road',
      addressTh: '99 ถนนส่วนตัว',
      taxId: '0105551234567',
      nationalId: '1234567890123',
      branchNumber: '00001',
      zip: '10110',
      country: 'TH',
      companyAddress: 'Private company address',
      metadata: { secret: true },
    })
    const activity = projectExternalMcpContactActivity({
      action: 'contact.updated',
      summaryKey: 'contact.updated',
      entityType: 'contact',
      createdAt: '2026-08-05T00:00:00.000Z',
      summaryParams: { note: 'private negotiation notes' },
      metadata: { ipAddress: '127.0.0.1' },
    })

    expect(contact).toEqual({
      id: 'contact-1',
      name: 'Ava Sensitive',
      role: 'Director',
      company: 'Example Co',
      email: 'ava@example.com',
      phone: '+66 812345678',
      tags: ['vip'],
      relationshipLevel: 4,
      stage: 'client',
      dealStatus: 'won',
      lastContactedAt: '2026-08-05T00:00:00.000Z',
      activeProjectCount: 2,
      totalBilledCents: 125_000,
    })
    expect(activity).toEqual({
      action: 'contact.updated',
      summary: 'contact.updated',
      entityType: 'contact',
      createdAt: '2026-08-05T00:00:00.000Z',
    })

    const serialized = JSON.stringify({ contact, activity })
    for (const sensitiveValue of [
      'private negotiation notes',
      'private.example.com',
      '99 Private Road',
      '0105551234567',
      '1234567890123',
      '00001',
      '10110',
      '127.0.0.1',
    ]) {
      expect(serialized).not.toContain(sensitiveValue)
    }
  })

  it('applies the safe projection to every external contact workflow response', async () => {
    const [user] = await db
      .insert(users)
      .values({ name: 'Contact projection test', email: `mcp-contact-projection-${crypto.randomUUID()}@example.com` })
      .returning()
    createdUserIds.push(user.id)
    const contact = await executeToolCall(user.id, 'create_contact', { name: 'Private contact' }) as { id: string }
    await db
      .update(contacts)
      .set({
        website: 'https://private.example.com',
        imageUrl: 'https://private.example.com/avatar.png',
        address: '99 Private Road',
        taxId: '0105551234567',
        nationalId: '1234567890123',
        branchNumber: '00001',
        zip: '10110',
        country: 'TH',
        lastContactedAt: new Date('2026-01-01T00:00:00.000Z'),
      })
      .where(eq(contacts.id, contact.id))

    const external = { source: 'external-mcp' as const }
    await db.insert(activityLogs).values({
      userId: user.id,
      contactId: contact.id,
      entityType: 'contact',
      entityId: contact.id,
      action: 'contact.updated',
      summaryKey: 'contact.updated',
      summaryParams: '{"note":"private negotiation notes"}',
      metadata: '{"ipAddress":"127.0.0.1"}',
    })

    const [contactResult, summaryResult, outreachResult, activityResult] = await Promise.all([
      executeToolCall(user.id, 'get_contact', { contactId: contact.id }, external),
      executeToolCall(user.id, 'summarize_contact', { contactId: contact.id }, external),
      executeToolCall(user.id, 'get_outreach_queue', { days: 30 }, external),
      executeToolCall(user.id, 'get_contact_activity', { contactId: contact.id }, external),
    ])
    const updateResult = await executeToolCall(user.id, 'update_contact', {
      contactId: contact.id,
      website: 'https://private.example.com',
    }, external)
    const noteResult = await executeToolCall(user.id, 'add_contact_note', {
      contactId: contact.id,
      note: 'private negotiation notes',
    }, external)

    expect(noteResult).toEqual({ success: true, contactId: contact.id })
    expect(contactResult).toMatchObject({ id: contact.id, name: 'Private contact' })
    expect(updateResult).toMatchObject({ id: contact.id, name: 'Private contact' })
    expect(summaryResult).toMatchObject({ contact: { id: contact.id, name: 'Private contact' } })
    expect(outreachResult).toEqual(expect.arrayContaining([expect.objectContaining({ id: contact.id })]))
    expect((activityResult as { items: unknown[] }).items).toEqual(expect.arrayContaining([
      { action: 'contact.updated', summary: 'contact.updated', entityType: 'contact', createdAt: expect.any(Date) },
    ]))

    const serialized = JSON.stringify({ noteResult, contactResult, updateResult, summaryResult, outreachResult, activityResult })
    for (const sensitiveValue of [
      'private negotiation notes',
      'private.example.com',
      '99 Private Road',
      '0105551234567',
      '1234567890123',
      '00001',
      '10110',
      '127.0.0.1',
    ]) {
      expect(serialized).not.toContain(sensitiveValue)
    }
  })
})
