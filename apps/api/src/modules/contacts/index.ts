import Elysia, { t } from 'elysia'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import {
  listContacts, createContact, patchContact, deleteContact,
  bulkDeleteContacts, importContacts, mergeContactsService, getContact,
  getContactBriefing, regenerateContactBriefing,
} from '@api/modules/contacts/service'
import {
  CreateContactBody, UpdateContactBody, ImportContactsBody,
  BulkDeleteBody, MergeContactBody, ImportVcardBody,
  ContactListRowResponse, ContactsListResponse, ContactBriefingResponse,
} from '@api/modules/contacts/model'
import { NotFoundResponse, NoContentResponse } from '@api/lib/wire-schema'
import { r2, R2_PUBLIC_BUCKET } from '@api/utils/r2'
import { buildPublicUrl, extractR2Key } from '@api/utils/r2/public-url'
import { env } from '@api/env'

function parseVcf(vcf: string) {
  const cards = vcf.split(/BEGIN:VCARD/i).filter((s) => s.trim())
  return cards.map((card) => {
    const get = (field: string) => {
      const m = card.match(new RegExp(`^${field}[^:]*:(.*)$`, 'im'))
      return m?.[1]?.trim() ?? ''
    }
    return {
      name: get('FN'),
      company: get('ORG'),
      role: get('TITLE'),
      email: get('EMAIL'),
      phone: get('TEL'),
      website: get('URL'),
    }
  })
}

export const contactsModule = new Elysia({ name: 'contacts', prefix: '/api' })
  .use(betterAuthPlugin)

  .get('/contacts', async ({ user }) => {
    return listContacts(user.id)
  }, { auth: true, response: { 200: ContactsListResponse }, detail: { tags: ['Contacts'], summary: 'List contacts' } })

  .post('/contacts', async ({ user, status, body }) => {
    const contact = await createContact(user.id, body)
    return status(201, contact)
  }, {
    auth: true,
    body: CreateContactBody,
    response: { 201: ContactListRowResponse },
    detail: { tags: ['Contacts'], summary: 'Create contact' },
  })


  .post('/contacts/import', async ({ user, body }) => {
    return importContacts(user.id, body.rows)
  }, {
    auth: true,
    body: ImportContactsBody,
    detail: { tags: ['Contacts'], summary: 'Bulk import contacts from CSV rows' },
  })

  .post('/contacts/import/vcard', async ({ user, body }) => {
    const cards = parseVcf(body.vcf)
    let imported = 0
    let skipped = 0
    for (const card of cards) {
      if (!card.name) { skipped++; continue }
      const initials = card.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('')
      await createContact(user.id, {
        name: card.name,
        initials,
        company: card.company || '',
        role: card.role || '',
        email: card.email || '',
        phone: card.phone || undefined,
        website: card.website || '',
        metVia: 'vCard',
      })
      imported++
    }
    return { imported, skipped }
  }, {
    auth: true,
    body: ImportVcardBody,
    detail: { tags: ['Contacts'], summary: 'Import contacts from vCard (.vcf)' },
  })

  .delete('/contacts/bulk', async ({ user, body }) => {
    const count = await bulkDeleteContacts(user.id, body.ids)
    return { deleted: count }
  }, {
    auth: true,
    body: BulkDeleteBody,
    detail: { tags: ['Contacts'], summary: 'Bulk delete contacts' },
  })

  .post('/contacts/:id/merge', async ({ user, status, params, body }) => {
    const result = await mergeContactsService(user.id, params.id, body.mergeIntoId)
    if (!result.merged) return status(404, { message: result.message })
    return result
  }, {
    auth: true,
    body: MergeContactBody,
    detail: { tags: ['Contacts'], summary: 'Merge contact into another' },
  })

  .patch('/contacts/:id', async ({ user, status, params, body }) => {
    const updated = await patchContact(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateContactBody,
    response: { 200: ContactListRowResponse, 404: NotFoundResponse },
    detail: { tags: ['Contacts'], summary: 'Update contact' },
  })

  .delete('/contacts/:id', async ({ user, status, params }) => {
    const deleted = await deleteContact(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { auth: true, response: { 204: NoContentResponse, 404: NotFoundResponse }, detail: { tags: ['Contacts'], summary: 'Delete contact' } })

  .post('/contacts/:id/image', async ({ user, params, body, status }) => {
    if (!env.R2_ACCESS_KEY_ID) {
      return status(503, { error: 'R2 not configured' })
    }

    const { data: base64Data, mediaType } = body as { data: string; mediaType: string }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(mediaType)) {
      return status(400, { message: 'Unsupported image type' })
    }

    const current = await getContact(user.id, params.id)
    if (!current) return status(404, { message: 'Not found' })

    let imageUrl: string
    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const ext = mediaType === 'image/jpeg' ? 'jpg' : (mediaType.split('/')[1] ?? 'jpg')
      const key = `contact-images/${params.id}-${Date.now()}.${ext}`

      const oldKey = current.imageUrl ? extractR2Key(current.imageUrl) : null
      if (oldKey?.startsWith('contact-images/')) {
        await r2.send(new DeleteObjectCommand({ Bucket: R2_PUBLIC_BUCKET, Key: oldKey })).catch(() => null)
      }

      await r2.send(new PutObjectCommand({
        Bucket: R2_PUBLIC_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mediaType,
        ContentLength: buffer.byteLength,
      }))

      imageUrl = buildPublicUrl(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed'
      return status(500, { message })
    }

    const updated = await patchContact(user.id, params.id, { imageUrl })
    return updated
  }, {
    auth: true,
    body: t.Object({
      // ~1.4x a 5MB binary cap — base64 inflates size by ~1.33x
      data: t.String({ maxLength: 7 * 1024 * 1024 }),
      mediaType: t.String(),
    }),
    detail: { tags: ['Contacts'], summary: 'Upload contact image' },
  })

  .delete('/contacts/:id/image', async ({ user, params, status }) => {
    const current = await getContact(user.id, params.id)
    if (!current) return status(404, { message: 'Not found' })

    const oldKey = current.imageUrl ? extractR2Key(current.imageUrl) : null
    if (oldKey?.startsWith('contact-images/')) {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_PUBLIC_BUCKET, Key: oldKey })).catch(() => null)
    }

    const updated = await patchContact(user.id, params.id, { imageUrl: null })
    return updated
  }, { auth: true, detail: { tags: ['Contacts'], summary: 'Delete contact image' } })

  .get('/contacts/:id/briefing', async ({ user, params, status }) => {
    const briefing = await getContactBriefing(user.id, params.id)
    if (!briefing) return status(404, { message: 'Not found' })
    return briefing
  }, { auth: true, response: { 200: ContactBriefingResponse, 404: NotFoundResponse }, detail: { tags: ['Contacts'], summary: 'Get cached AI relationship briefing for a contact' } })

  .post('/contacts/:id/briefing/regenerate', async ({ user, params, status }) => {
    const briefing = await regenerateContactBriefing(user.id, params.id)
    if (!briefing) return status(404, { message: 'Not found' })
    return briefing
  }, { auth: true, response: { 200: ContactBriefingResponse, 404: NotFoundResponse }, detail: { tags: ['Contacts'], summary: 'Regenerate AI relationship briefing for a contact' } })

  .get('/contacts/:id/vcard', async ({ user, params, status }) => {
    const contact = await getContact(user.id, params.id)
    if (!contact) return status(404, { message: 'Not found' })

    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      `ORG:${contact.company}`,
      `TITLE:${contact.role}`,
      `EMAIL:${contact.email}`,
      `TEL:${contact.phone ?? ''}`,
      `URL:${contact.website}`,
      'END:VCARD',
    ].join('\r\n')

    const safeName = contact.name.replace(/[^a-z0-9]/gi, '_')
    return new Response(vcf, {
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': `attachment; filename="${safeName}.vcf"`,
      },
    })
  }, { auth: true, detail: { tags: ['Contacts'], summary: 'Export contact as vCard' } })
