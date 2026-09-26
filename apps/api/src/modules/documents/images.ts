import { r2ObjectStore } from '@api/modules/storage/object-store'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

const PREFIX = 'document-assets/'

export type DocumentImageKind = 'logo' | 'signature'
export type DocumentImageOwner = 'profile' | 'document'

export function documentImageKey(
  owner: DocumentImageOwner,
  ownerId: string,
  kind: DocumentImageKind,
  mediaType: string,
) {
  const ext = mediaType === 'image/jpeg' ? 'jpg' : (mediaType.split('/')[1] ?? 'jpg')
  return `${PREFIX}${owner}/${ownerId}/${kind}.${ext}`
}

export async function uploadDocumentImage(
  owner: DocumentImageOwner,
  ownerId: string,
  kind: DocumentImageKind,
  base64Data: string,
  mediaType: string,
  previousKey: string | null,
) {
  if (!ALLOWED_TYPES.includes(mediaType as (typeof ALLOWED_TYPES)[number])) {
    throw new Error('Unsupported image type')
  }

  const buffer = Buffer.from(base64Data, 'base64')
  const key = documentImageKey(owner, ownerId, kind, mediaType)

  // Different extension for the same slot leaves a stale object — clear it.
  if (previousKey?.startsWith(PREFIX) && previousKey !== key) {
    await r2ObjectStore.delete(previousKey).catch(() => null)
  }

  await r2ObjectStore.put(key, buffer, mediaType)

  return key
}

export async function deleteDocumentImage(key: string | null) {
  if (!key?.startsWith(PREFIX)) return
  await r2ObjectStore.delete(key).catch(() => null)
}

// Copy a stored image (preset → document) so the document owns its own object
// and survives the source being edited or deleted. Returns the new key, or the
// source value unchanged when it's a legacy URL (nothing to copy) or empty.
export async function copyDocumentImage(
  sourceValue: string | null,
  targetOwnerId: string,
  kind: DocumentImageKind,
): Promise<string | null> {
  if (!sourceValue) return null
  if (!sourceValue.startsWith(PREFIX)) return sourceValue
  const ext = sourceValue.split('.').pop() ?? 'png'
  const key = `${PREFIX}document/${targetOwnerId}/${kind}.${ext}`
  // The preset can point at an object that is gone (deleted upload, seeded row,
  // bucket migration). R2 answers NoSuchKey and that must not fail the create.
  const copied = await r2ObjectStore.copy(sourceValue, key).then(() => true).catch(() => false)
  return copied ? key : null
}

// A stored value is either an R2 key (uploaded image) or a legacy pasted URL.
// Presign keys; pass URLs through untouched.
export async function presignDocumentImage(value: string | null) {
  if (!value) return null
  if (!value.startsWith(PREFIX)) return value
  return r2ObjectStore.signGet(value, 3600)
}
