import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, r2Presigner, R2_BUCKET } from '@api/utils/r2'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export function templateImageKey(templateId: string, mediaType: string) {
  const ext = mediaType === 'image/jpeg' ? 'jpg' : (mediaType.split('/')[1] ?? 'jpg')
  return `template-images/${templateId}.${ext}`
}

export async function uploadTemplateImage(
  templateId: string,
  base64Data: string,
  mediaType: string,
  previousKey: string | null,
) {
  if (!ALLOWED_TYPES.includes(mediaType as (typeof ALLOWED_TYPES)[number])) {
    throw new Error('Unsupported image type')
  }

  const buffer = Buffer.from(base64Data, 'base64')
  const key = templateImageKey(templateId, mediaType)

  if (previousKey?.startsWith('template-images/') && previousKey !== key) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: previousKey })).catch(() => null)
  }

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mediaType,
    ContentLength: buffer.byteLength,
  }))

  return key
}

export async function deleteTemplateImage(key: string | null) {
  if (!key?.startsWith('template-images/')) return
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })).catch(() => null)
}

export async function presignTemplateImage(key: string | null) {
  if (!key) return null
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  return getSignedUrl(r2Presigner, command, { expiresIn: 3600 })
}
