import { db } from '@api/db'
import { documentToWire, type DocumentWire } from '@api/modules/documents/wire'
import {
  deleteDocumentImage,
  type DocumentImageKind,
  uploadDocumentImage,
} from '@api/modules/documents/images'
import { documents, documentItems } from '@mana/db'
import { and, eq, isNull } from 'drizzle-orm'

const IMAGE_COLUMN: Record<DocumentImageKind, 'yourLogo' | 'signatureImage'> = {
  logo: 'yourLogo',
  signature: 'signatureImage',
}

async function documentWithImage(
  userId: string,
  id: string,
  kind: DocumentImageKind,
  value: string | null,
): Promise<DocumentWire | null> {
  const column = IMAGE_COLUMN[kind]
  const [updated] = await db
    .update(documents)
    .set({ [column]: value, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning()
  if (!updated) return null

  const items = await db
    .select()
    .from(documentItems)
    .where(eq(documentItems.documentId, id))
    .orderBy(documentItems.position)
  return documentToWire(updated, items)
}

export async function setDocumentImage(
  userId: string,
  id: string,
  kind: DocumentImageKind,
  base64Data: string,
  mediaType: string,
): Promise<DocumentWire | null> {
  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)))
  if (!existing) return null

  const column = IMAGE_COLUMN[kind]
  const key = await uploadDocumentImage('document', id, kind, base64Data, mediaType, existing[column])
  return documentWithImage(userId, id, kind, key)
}

export async function clearDocumentImage(
  userId: string,
  id: string,
  kind: DocumentImageKind,
): Promise<DocumentWire | null> {
  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId), isNull(documents.deletedAt)))
  if (!existing) return null

  await deleteDocumentImage(existing[IMAGE_COLUMN[kind]])
  return documentWithImage(userId, id, kind, null)
}
